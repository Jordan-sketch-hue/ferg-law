/**
 * GET /api/cron/monthly-report
 * Runs on the 1st of each month at 7 AM JA time (12:00 UTC).
 * Sends Owen a performance digest for the prior month.
 */
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { notifyOwenWA } from "@/lib/wa-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const token = process.env.FL_ADMIN_TOKEN ?? "";

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthLabel = monthStart.toLocaleString("en-JM", { month: "long", year: "numeric", timeZone: "UTC" });

  const [leadsRes, apptsRes, mattersRes] = await Promise.all([
    supabase.rpc("fl_admin_leads", { p_token: token }),
    supabase.rpc("fl_admin_appointments", { p_token: token }),
    supabase.rpc("fl_admin_matters", { p_token: token }),
  ]);

  const leads = (leadsRes.data ?? []) as { created_at: string; status: string; source: string | null }[];
  const appts = (apptsRes.data ?? []) as { created_at: string; starts_at: string; status: string; service: string | null }[];
  const matters = (mattersRes.data ?? []) as { created_at: string; stage: string; payment_status: string; transaction_value_jmd: number | null }[];

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= monthStart.getTime() && t < monthEnd.getTime();
  };

  const mLeads = leads.filter((l) => inRange(l.created_at));
  const mAppts = appts.filter((a) => inRange(a.starts_at));
  const mMatters = matters.filter((m) => inRange(m.created_at));

  const stats = {
    newLeads: mLeads.length,
    booked: mAppts.filter((a) => a.status !== "cancelled").length,
    confirmed: mAppts.filter((a) => a.status === "confirmed" || a.status === "completed").length,
    cancelled: mAppts.filter((a) => a.status === "cancelled").length,
    newMatters: mMatters.length,
    retainedMatters: mMatters.filter((m) => ["retainer", "active", "closed"].includes(m.stage)).length,
    conversionRate: mLeads.length > 0 ? Math.round((mAppts.filter(a => a.status !== "cancelled").length / mLeads.length) * 100) : 0,
  };

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e7e1d6;">
<tr><td style="background:#102A1E;padding:28px 36px;">
  <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C8A65C;">Ferguson Law — Monthly Report</div>
  <div style="font-size:22px;color:#fff;margin-top:8px;font-weight:600;">${monthLabel}</div>
</td></tr>
<tr><td style="padding:32px 36px;">
  <table role="presentation" width="100%" style="background:#f8f6f1;border:1px solid #ece6da;border-radius:10px;"><tr><td style="padding:24px;">
    <table width="100%">
      <tr>
        <td style="padding:8px 12px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#102A1E;">${stats.newLeads}</div><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;margin-top:4px;">New Leads</div></td>
        <td style="padding:8px 12px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#102A1E;">${stats.booked}</div><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;margin-top:4px;">Bookings</div></td>
        <td style="padding:8px 12px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#C8A65C;">${stats.conversionRate}%</div><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;margin-top:4px;">Conversion</div></td>
        <td style="padding:8px 12px;text-align:center;"><div style="font-size:28px;font-weight:700;color:#102A1E;">${stats.retainedMatters}</div><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9a8f7a;margin-top:4px;">Retained</div></td>
      </tr>
    </table>
  </td></tr></table>
  <p style="font-size:13px;color:#9a9a9a;margin:20px 0 0;">View full details in your <a href="https://fergusonlawja.com/admin" style="color:#C8A65C;">back office</a>.</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const resend = new Resend(key);
    await resend.emails.send({
      from: "Ferguson Law <contact@fergusonlawja.com>",
      to: ["owen@fergusonlawja.com"],
      subject: `Monthly Report — ${monthLabel}`,
      html,
    });
  }

  void notifyOwenWA(`📊 *${monthLabel} Report*\nLeads: ${stats.newLeads} · Bookings: ${stats.booked} · Conversion: ${stats.conversionRate}%\nRetained matters: ${stats.retainedMatters}\nFull report: fergusonlawja.com/admin`);

  return Response.json({ ok: true, month: monthLabel, stats });
}
