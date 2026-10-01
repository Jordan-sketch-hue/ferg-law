import { NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both shapes:
    //  new: { endpoint, p256dh, auth, token }
    //  legacy: { subscription: { endpoint, keys: { p256dh, auth } }, userRole, userRef }
    let endpoint: string;
    let p256dh: string;
    let auth: string;
    let userRole = "admin";
    let userRef: string | null = null;

    const supabase = createAdminClient();

    if (body.endpoint) {
      endpoint = body.endpoint;
      p256dh = body.p256dh ?? "";
      auth = body.auth ?? "";
      // Validate via fl_is_admin so any valid admin token works (not just FL_ADMIN_TOKEN)
      const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: body.token ?? "" });
      if (!isAdmin) {
        return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    } else if (body.subscription?.endpoint) {
      endpoint = body.subscription.endpoint;
      p256dh = body.subscription.keys?.p256dh ?? "";
      auth = body.subscription.keys?.auth ?? "";
      userRole = body.userRole ?? "public";
      userRef = body.userRef ?? null;
    } else {
      return Response.json({ ok: false, error: "Invalid subscription" }, { status: 400 });
    }

    const { error } = await supabase.from("fl_push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_role: userRole,
        user_ref: userRef,
        site: "ferguson-law",
        last_used: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

    // Send a welcome push so the admin confirms it works
    const vapidPublic = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^﻿/, "").replace(/=+$/, "");
    const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/^﻿/, "").replace(/=+$/, "");
    if (vapidPublic && vapidPrivate) {
      try {
        webpush.setVapidDetails("mailto:contact@fergusonlawja.com", vapidPublic, vapidPrivate);
        await webpush.sendNotification(
          { endpoint, keys: { p256dh, auth } },
          JSON.stringify({
            title: "Notifications are on",
            body: "You will now receive alerts from Ferguson Law on this device.",
            url: "/admin",
            icon: "/favicon-512.png",
            badge: "/favicon-180.png",
            tag: "fl-welcome",
          }),
        );
      } catch { /* best-effort — subscription already saved */ }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint, token } = await req.json();
    if (!endpoint) return Response.json({ ok: false, error: "Missing endpoint" }, { status: 400 });
    const supabase = createAdminClient();
    const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token ?? "" });
    if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    await supabase.from("fl_push_subscriptions").delete().eq("endpoint", endpoint);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
