/**
 * POST /api/client/kyc  — submit KYC information for the authenticated client.
 * GET  /api/client/kyc  — fetch the client's current KYC status.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendKycSubmittedToStaff } from "@/lib/email/cms";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fl_client_kyc")
    .select("id, full_legal_name, date_of_birth, nationality, address, trn, id_type, id_number, id_doc_url, source_of_funds, is_pep, submitted_at, status, reviewer_notes")
    .eq("client_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kyc: data ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json() as {
    full_legal_name: string;
    date_of_birth: string;
    nationality: string;
    address: string;
    trn?: string;
    id_type: string;
    id_number: string;
    id_doc_url?: string;
    source_of_funds: string;
    is_pep: boolean;
  };

  if (!body.full_legal_name?.trim() || !body.date_of_birth || !body.id_type || !body.id_number?.trim()) {
    return NextResponse.json({ error: "Missing required KYC fields." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert on client_id so re-submissions update the existing row
  const { error } = await admin
    .from("fl_client_kyc")
    .upsert({
      client_id: user.id,
      full_legal_name: body.full_legal_name.trim(),
      date_of_birth: body.date_of_birth,
      nationality: body.nationality?.trim() || null,
      address: body.address?.trim() || null,
      trn: body.trn?.trim() || null,
      id_type: body.id_type,
      id_number: body.id_number.trim(),
      id_doc_url: body.id_doc_url || null,
      source_of_funds: body.source_of_funds?.trim() || null,
      is_pep: body.is_pep ?? false,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    }, { onConflict: "client_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify staff (best-effort)
  void sendKycSubmittedToStaff(
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
    user.email!,
  ).catch(() => null);

  return NextResponse.json({ ok: true });
}
