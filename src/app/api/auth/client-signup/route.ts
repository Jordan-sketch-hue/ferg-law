/**
 * POST /api/auth/client-signup
 * Creates a client account with email pre-confirmed so Supabase never sends
 * a confirmation email. Uses the service role admin client.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWelcomeToClient } from "@/lib/email/cms";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone, intent } = (await req.json()) as {
      email: string;
      password: string;
      name: string;
      phone?: string;
      intent?: "property_purchase" | "property_sale" | "general";
    };

    if (!email?.trim() || !password || !name?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create user with email_confirm: true so no confirmation email is sent
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim(), role: "client", phone_number: phone?.trim() || null },
    });

    if (error) {
      // Surface duplicate-email in a friendly way
      if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ error: "An account with that email already exists. Please sign in instead." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fire welcome email (best-effort)
    void sendWelcomeToClient(email.trim().toLowerCase(), name.trim()).catch(() => null);

    // Open an intake matter immediately so the client lands straight in the
    // portal's active-matter view instead of an empty "no matters yet" screen.
    if (data.user?.id) {
      const { error: matterErr } = await admin.rpc("fl_open_matter", {
        p_client_id: data.user.id,
        p_workflow_type: intent ?? "general",
        p_title: null,
      });
      if (matterErr) console.error("fl_open_matter failed on signup:", matterErr.message);
    }

    return NextResponse.json({ ok: true, userId: data.user?.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
