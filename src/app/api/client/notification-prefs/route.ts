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

interface CcContact {
  name: string;
  whatsapp?: string;
  email?: string;
}

const DEFAULTS = {
  weekly_digest: true,
  milestone_updates: true,
  message_notifications: true,
  appointment_reminders: true,
  whatsapp_updates: false,
  cc_contacts: [] as CcContact[],
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

  const stored = (data?.notification_prefs ?? {}) as Record<string, unknown>;
  const prefs = { ...DEFAULTS, ...stored, cc_contacts: (stored.cc_contacts as CcContact[]) ?? [] };

  return Response.json({ ok: true, prefs });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "bad request" }, { status: 400 }); }

  const rawCC = Array.isArray(body.cc_contacts) ? body.cc_contacts as unknown[] : [];
  const ccContacts: CcContact[] = rawCC
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map(c => ({
      name: String(c.name ?? "").slice(0, 80),
      whatsapp: c.whatsapp ? String(c.whatsapp).slice(0, 30) : undefined,
      email: c.email ? String(c.email).slice(0, 120) : undefined,
    }))
    .filter(c => c.name && (c.whatsapp || c.email))
    .slice(0, 5);

  const prefs = {
    weekly_digest: body.weekly_digest !== false,
    milestone_updates: body.milestone_updates !== false,
    message_notifications: body.message_notifications !== false,
    appointment_reminders: body.appointment_reminders !== false,
    whatsapp_updates: body.whatsapp_updates === true,
    cc_contacts: ccContacts,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("fl_clients")
    .update({ notification_prefs: prefs })
    .eq("email", user.email);

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, prefs });
}
