/**
 * GET  /api/client/notification-prefs  — return current prefs for the authed client
 * POST /api/client/notification-prefs  — update prefs
 */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS = {
  weekly_digest: true,
  milestone_updates: true,
  message_notifications: true,
  appointment_reminders: true,
};

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("fl_clients")
    .select("notification_prefs")
    .eq("email", user.email)
    .single();

  return Response.json({ ok: true, prefs: data?.notification_prefs ?? DEFAULTS });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "bad request" }, { status: 400 }); }

  const prefs = {
    weekly_digest: body.weekly_digest !== false,
    milestone_updates: body.milestone_updates !== false,
    message_notifications: body.message_notifications !== false,
    appointment_reminders: body.appointment_reminders !== false,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("fl_clients")
    .update({ notification_prefs: prefs })
    .eq("email", user.email);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, prefs });
}
