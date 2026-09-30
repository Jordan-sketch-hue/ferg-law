import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/email/send";
import { fullWhenLabel } from "@/lib/booking/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ref } = (await req.json()) as { ref?: string };
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("name, email, service, starts_at, ref")
    .eq("ref", ref)
    .maybeSingle();

  if (error || !appt) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  const whenLabel = fullWhenLabel(appt.starts_at);
  const result = await sendBookingConfirmation({
    to: appt.email,
    name: appt.name,
    service: appt.service,
    whenLabel,
    ref: appt.ref,
  });

  return NextResponse.json({ ok: true, result });
}
