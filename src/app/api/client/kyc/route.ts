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

  const contentType = req.headers.get("content-type") ?? "";
  const admin = createAdminClient();

  let fields: {
    full_legal_name: string;
    date_of_birth: string;
    nationality: string;
    address: string;
    trn?: string;
    id_type: string;
    id_number: string;
    source_of_funds: string;
    is_pep: boolean;
  };
  let id_doc_url: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    fields = {
      full_legal_name: fd.get("full_legal_name") as string ?? "",
      date_of_birth: fd.get("date_of_birth") as string ?? "",
      nationality: fd.get("nationality") as string ?? "",
      address: fd.get("address") as string ?? "",
      trn: fd.get("trn") as string ?? "",
      id_type: fd.get("id_type") as string ?? "national_id",
      id_number: fd.get("id_number") as string ?? "",
      source_of_funds: fd.get("source_of_funds") as string ?? "",
      is_pep: fd.get("is_pep") === "true",
    };
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `kyc/${user.id}/id_doc.${ext}`;
      const { error: upErr } = await admin.storage
        .from("fl-matter-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (!upErr) {
        const { data: signed } = await admin.storage
          .from("fl-matter-files")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1-year signed URL
        id_doc_url = signed?.signedUrl ?? null;
      }
    }
  } else {
    fields = await req.json() as typeof fields;
  }

  if (!fields.full_legal_name?.trim() || !fields.date_of_birth || !fields.id_type || !fields.id_number?.trim()) {
    return NextResponse.json({ error: "Missing required KYC fields." }, { status: 400 });
  }

  const { error } = await admin
    .from("fl_client_kyc")
    .upsert({
      client_id: user.id,
      full_legal_name: fields.full_legal_name.trim(),
      date_of_birth: fields.date_of_birth,
      nationality: fields.nationality?.trim() || null,
      address: fields.address?.trim() || null,
      trn: fields.trn?.trim() || null,
      id_type: fields.id_type,
      id_number: fields.id_number.trim(),
      ...(id_doc_url ? { id_doc_url } : {}),
      source_of_funds: fields.source_of_funds?.trim() || null,
      is_pep: fields.is_pep ?? false,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    }, { onConflict: "client_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void sendKycSubmittedToStaff(
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
    user.email!,
  ).catch(() => null);

  return NextResponse.json({ ok: true });
}
