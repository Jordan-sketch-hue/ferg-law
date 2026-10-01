import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendConsultationFollowUp } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  if (!token) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id: string; notes?: string };
  if (!body?.id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });

  const { data: rows } = await supabase
    .from("appointments")
    .select("ref, name, email, service, starts_at")
    .eq("id", body.id)
    .limit(1);

  const appt = rows?.[0];
  if (!appt?.email) return Response.json({ ok: false, error: "No email on appointment" }, { status: 400 });

  const adminEmail = process.env.FERGUSON_ADMIN_EMAIL || process.env.FERGUSON_STAFF_EMAIL || "owenkferguson@hotmail.com";
  const result = await sendConsultationFollowUp({
    to: appt.email,
    name: appt.name || "",
    service: appt.service || "Consultation",
    ref: appt.ref,
    adminBcc: adminEmail,
    notes: body.notes || undefined,
  });

  return Response.json(result);
}
