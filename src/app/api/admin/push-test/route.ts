import { NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token?: string };

  const supabase = createAdminClient();

  // Validate admin token
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token ?? "" });
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const vapidPublic = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^﻿/, "").replace(/=+$/, "");
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").replace(/^﻿/, "").replace(/=+$/, "");
  if (!vapidPublic || !vapidPrivate) {
    return Response.json({ ok: false, error: "VAPID keys not configured" }, { status: 503 });
  }

  webpush.setVapidDetails("mailto:contact@fergusonlawja.com", vapidPublic, vapidPrivate);

  // Get all subscriptions for this admin token
  const { data: subs } = await supabase
    .from("fl_push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_role", "admin")
    .eq("user_ref", token ?? "");

  if (!subs || subs.length === 0) {
    return Response.json({ ok: false, error: "No subscriptions found — enable notifications first" }, { status: 404 });
  }

  const payload = JSON.stringify({
    title: "Test notification",
    body: "Push notifications are working on this device.",
    url: "/admin",
    icon: "/favicon-512.png",
    badge: "/favicon-180.png",
    tag: "fl-test",
  });

  let sent = 0;
  const dead: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.endpoint);
      }
    })
  );

  if (dead.length > 0) {
    await supabase.from("fl_push_subscriptions").delete().in("endpoint", dead);
  }

  return Response.json({ ok: sent > 0, sent, dead: dead.length });
}
