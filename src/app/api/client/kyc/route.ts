/**
 * POST /api/client/kyc  — submit KYC information for the authenticated client.
 * GET  /api/client/kyc  — fetch the client's current KYC status.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendKycSubmittedToStaff } from "@/lib/email/cms";
import { pushToAdmins } from "@/lib/push";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fl_client_kyc")
    .select("id, full_legal_name, date_of_birth, nationality, address, trn, id_type, id_number, id_doc_url, source_of_funds, is_pep, aml_declared, submitted_at, status, reviewer_notes")
    .eq("client_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[KYC GET] db error", { userId: user.id, code: error.code, message: error.message });
    return NextResponse.json({ error: "Unable to load your identity information. Please try again." }, { status: 500 });
  }
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
    aml_declared: boolean;
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
      aml_declared: fd.get("aml_declared") === "true",
    };
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `kyc/${user.id}/id_doc.${ext}`;
      const { error: upErr } = await admin.storage
        .from("fl-matter-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        console.error("[KYC POST] file upload error", { userId: user.id, code: upErr.message });
        return NextResponse.json({ error: "Your ID document could not be uploaded. Please try a smaller file (under 5 MB) or a different format, then resubmit." }, { status: 500 });
      }
      const { data: signed } = await admin.storage
        .from("fl-matter-files")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1-year signed URL
      id_doc_url = signed?.signedUrl ?? null;
    }
  } else {
    fields = await req.json() as typeof fields;
  }

  if (!fields.full_legal_name?.trim() || !fields.date_of_birth || !fields.id_type || !fields.id_number?.trim()) {
    return NextResponse.json({ error: "Please fill in your full legal name, date of birth, ID type, and ID number before submitting." }, { status: 400 });
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
      aml_declared: fields.aml_declared ?? false,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    }, { onConflict: "client_id" });

  if (error) {
    console.error("[KYC POST] upsert error", { userId: user.id, code: error.code, message: error.message, details: error.details });
    return NextResponse.json({ error: "We couldn't save your information. Please check your details and try again. If the problem continues, contact Ferguson Law directly." }, { status: 500 });
  }

  // Sync kyc_status on all matters for this client: pending → submitted
  // (approved/flagged matters are never downgraded back)
  const { error: syncErr } = await admin
    .from("fl_client_matters")
    .update({ kyc_status: "submitted" })
    .eq("client_id", user.id)
    .eq("kyc_status", "pending");

  if (syncErr) {
    console.error("[KYC POST] matter sync error", { userId: user.id, code: syncErr.code, message: syncErr.message });
  }

  const clientName = String(user.user_metadata?.full_name || user.email?.split("@")[0] || "Client");
  void sendKycSubmittedToStaff(clientName, user.email!).catch((e) => {
    console.error("[KYC POST] staff email failed", { userId: user.id, error: String(e) });
  });
  void pushToAdmins(`KYC Submitted — ${clientName}`, "Review required", "/admin?tab=clients", "fl-kyc");

  return NextResponse.json({ ok: true });
}
