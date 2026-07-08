/**
 * GET /api/cron/reminders — automatic appointment reminders.
 *
 * Run on a schedule (Vercel Cron, hourly). Each run finds confirmed bookings
 * entering the 24h and 1h windows, emails a branded reminder, and marks each so
 * it fires exactly once. Reads/writes go through token-gated SECURITY DEFINER
 * RPCs (no service-role key needed).
 *
 * Auth: when CRON_SECRET is set, Vercel sends `Authorization: Bearer <secret>`;
 * we reject anything else so the endpoint can't be triggered by the public.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBookingReminder } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DueRow = {
  ref: string;
  name: string | null;
  email: string | null;
  service: string | null;
  starts_at: string | null;
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "cron not configured" }, { status: 401 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.FL_ADMIN_TOKEN || "";
  const supabase = createAdminClient();
  const result: Record<string, number> = { "24h": 0, "1h": 0 };

  for (const kind of ["24h", "1h"] as const) {
    const { data, error } = await supabase.rpc("fl_due_reminders", {
      p_token: token,
      p_kind: kind,
    });
    if (error || !Array.isArray(data)) continue;

    for (const row of data as DueRow[]) {
      if (!row.email) continue;
      const send = await sendBookingReminder({
        to: row.email,
        name: row.name || "",
        service: row.service || "Consultation",
        whenLabel: row.starts_at ? fullWhenLabel(row.starts_at) : "",
        ref: row.ref,
        kind,
      });
      // Mark only when we actually attempted a send (ok or hard error). When
      // Resend isn't configured the send is "skipped" — leave it unmarked so it
      // can still fire once email is turned on (and it's still in-window).
      if (!("skipped" in send)) {
        await supabase.rpc("fl_mark_reminded", {
          p_token: token,
          p_ref: row.ref,
          p_kind: kind,
        });
        result[kind] += 1;
      }
    }
  }

  return Response.json({ ok: true, sent: result });
}
