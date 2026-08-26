import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) return NextResponse.json({ error: "Missing id or token." }, { status: 400 });

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("fl_is_admin", { p_token: token });
  if (!isAdmin) return NextResponse.json({ error: "Not authorised." }, { status: 403 });

  const admin = createAdminClient();

  const { data: payment, error } = await admin
    .from("fl_matter_payments")
    .select("id, matter_id, kind, amount_jmd, method, reference, status, confirmed_at, created_at, receipt_number, fl_client_matters(title, matter_type, client_id, client_name)")
    .eq("id", id)
    .single();

  if (error || !payment) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });

  const matter = payment.fl_client_matters as unknown as { title: string | null; matter_type: string; client_id: string | null; client_name: string | null };
  let clientName: string | null = matter?.client_name || null;
  let clientEmail: string | null = null;

  if (matter?.client_id) {
    const { data: userRes } = await admin.auth.admin.getUserById(matter.client_id);
    const authName = (userRes?.user?.user_metadata?.full_name as string | undefined)
      || (userRes?.user?.user_metadata?.name as string | undefined)
      || null;
    if (authName) clientName = authName;
    clientEmail = userRes?.user?.email || null;
  }

  return NextResponse.json({
    data: {
      receipt_number: payment.receipt_number,
      amount_jmd: Number(payment.amount_jmd),
      kind: payment.kind,
      method: payment.method,
      reference: payment.reference,
      confirmed_at: payment.confirmed_at,
      created_at: payment.created_at,
      matter_title: matter?.title || null,
      matter_type: matter?.matter_type || "",
      client_name: clientName,
      client_email: clientEmail,
    },
  });
}
