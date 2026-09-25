/**
 * POST /api/admin/backfill-from-appointments
 * For "New Booking" emails with empty body — reconstruct the body from
 * our own appointments table using the FL ref extracted from the subject.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fullWhenLabel } from "@/lib/booking/format";

interface EmailRow {
  id: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
}

interface Appointment {
  ref: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  starts_at: string;
  meta: { notes?: string } | null;
  payment_status: string;
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: valid } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find New Booking emails with empty body
  const { data: emails } = await supabase
    .from("fl_inbound_emails")
    .select("id, subject, body_text, body_html")
    .ilike("subject", "New Booking%")
    .or("body_text.is.null,body_text.eq.");

  const targets = (emails as EmailRow[] ?? []).filter(
    (e) => !e.body_text?.trim() && !e.body_html?.trim()
  );

  const results: { id: string; subject: string; ref: string | null; fixed: boolean }[] = [];

  for (const email of targets) {
    // Extract FL-XXXXXX from subject
    const refMatch = email.subject.match(/FL-\d{6}/);
    // Or extract name from "New Booking (Free): Name — Service"
    const nameMatch = email.subject.match(/New Booking[^:]*:\s*(.+?)\s*[—–-]/);
    const extractedName = nameMatch?.[1]?.trim() ?? null;

    let ref: string | null = refMatch?.[0] ?? null;
    let appt: Appointment | null = null;

    if (ref) {
      const { data } = await supabase
        .from("appointments")
        .select("ref, name, email, phone, service, starts_at, meta, payment_status")
        .eq("ref", ref)
        .maybeSingle();
      appt = data as Appointment | null;
    }

    // Fallback: match by name if no ref in subject
    if (!appt && extractedName) {
      const { data } = await supabase
        .from("appointments")
        .select("ref, name, email, phone, service, starts_at, meta, payment_status")
        .ilike("name", `%${extractedName}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      appt = data as Appointment | null;
      if (appt) ref = appt.ref;
    }

    if (appt) {
      const isFree = appt.payment_status === "free";
      const notes = (appt.meta as { notes?: string } | null)?.notes;
      const whenLabel = fullWhenLabel(appt.starts_at);
      const body = isFree
        ? `New free booking\n\nRef: ${appt.ref}\nName: ${appt.name}\nEmail: ${appt.email}\nPhone: ${appt.phone}\nService: ${appt.service}\nWhen: ${whenLabel}\nNotes: ${notes || "—"}`
        : `New booking (payment pending)\n\nRef: ${appt.ref}\nName: ${appt.name}\nEmail: ${appt.email}\nPhone: ${appt.phone}\nService: ${appt.service}\nWhen: ${whenLabel}\nNotes: ${notes || "—"}`;

      await supabase
        .from("fl_inbound_emails")
        .update({ body_text: body, thread_id: appt.ref })
        .eq("id", email.id);

      results.push({ id: email.id, subject: email.subject, ref, fixed: true });
    } else {
      results.push({ id: email.id, subject: email.subject, ref, fixed: false });
    }
  }

  return NextResponse.json({ ok: true, processed: targets.length, results });
}
