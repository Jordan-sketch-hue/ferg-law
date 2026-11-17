/**
 * POST /api/client/kyc  — submit KYC information for the authenticated client.
 * GET  /api/client/kyc  — fetch the client's current KYC status.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendKycSubmittedToStaff } from "@/lib/email/cms";
import { pushToAdmins } from "@/lib/push";

const INDIVIDUAL_SELECT = [
  "id","kyc_type","full_legal_name","date_of_birth","nationality","country_of_residence",
  "occupation","address","trn","id_type","id_number","id_expiry_date","id_doc_url",
  "id2_type","id2_number","id2_expiry_date","id2_doc_url",
  "source_of_funds","source_of_wealth","purpose_of_transaction",
  "is_pep","pep_details","aml_declared","submitted_at","status","reviewer_notes",
];
const ENTITY_SELECT = [
  ...INDIVIDUAL_SELECT,
  "entity_name","entity_type","entity_registration_number","entity_date_of_incorporation",
  "entity_country_of_incorporation","entity_registered_address","entity_principal_address",
  "entity_nature_of_business","entity_trn","entity_resolution_url",
  "entity_directors","entity_beneficial_owners","entity_authorised_signatories",
  "entity_has_pep_director","entity_pep_details",
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fl_client_kyc")
    .select(ENTITY_SELECT.join(", "))
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fields: Record<string, any> = {};
  let id_doc_url: string | null = null;
  let id2_doc_url: string | null = null;
  let entity_resolution_url: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const getString = (key: string) => (fd.get(key) as string | null) ?? "";

    fields = {
      kyc_type: getString("kyc_type") || "individual",
      // Individual
      full_legal_name: getString("full_legal_name"),
      date_of_birth: getString("date_of_birth"),
      nationality: getString("nationality"),
      address: getString("address"),
      trn: getString("trn"),
      id_type: getString("id_type") || "national_id",
      id_number: getString("id_number"),
      id_expiry_date: getString("id_expiry_date") || null,
      id2_type: getString("id2_type") || null,
      id2_number: getString("id2_number") || null,
      id2_expiry_date: getString("id2_expiry_date") || null,
      country_of_residence: getString("country_of_residence"),
      occupation: getString("occupation"),
      source_of_funds: getString("source_of_funds"),
      source_of_wealth: getString("source_of_wealth"),
      purpose_of_transaction: getString("purpose_of_transaction"),
      is_pep: getString("is_pep") === "true",
      pep_details: getString("pep_details"),
      aml_declared: getString("aml_declared") === "true",
      // Entity
      entity_name: getString("entity_name") || null,
      entity_type: getString("entity_type") || null,
      entity_registration_number: getString("entity_registration_number") || null,
      entity_date_of_incorporation: getString("entity_date_of_incorporation") || null,
      entity_country_of_incorporation: getString("entity_country_of_incorporation") || null,
      entity_registered_address: getString("entity_registered_address") || null,
      entity_principal_address: getString("entity_principal_address") || null,
      entity_nature_of_business: getString("entity_nature_of_business") || null,
      entity_trn: getString("entity_trn") || null,
      entity_has_pep_director: getString("entity_has_pep_director") === "true",
      entity_pep_details: getString("entity_pep_details") || null,
    };

    // Parse JSON fields
    try { fields.entity_directors = JSON.parse(getString("entity_directors") || "null"); } catch { fields.entity_directors = null; }
    try { fields.entity_beneficial_owners = JSON.parse(getString("entity_beneficial_owners") || "null"); } catch { fields.entity_beneficial_owners = null; }
    try { fields.entity_authorised_signatories = JSON.parse(getString("entity_authorised_signatories") || "null"); } catch { fields.entity_authorised_signatories = null; }

    // File uploads
    const uploadFile = async (file: File, subPath: string): Promise<string | null> => {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `kyc/${user.id}/${subPath}.${ext}`;
      const { error: upErr } = await admin.storage
        .from("fl-matter-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) return null;
      const { data: signed } = await admin.storage
        .from("fl-matter-files")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      return signed?.signedUrl ?? null;
    };

    const file1 = fd.get("file");
    if (file1 instanceof File && file1.size > 0) id_doc_url = await uploadFile(file1, "id_doc");

    const file2 = fd.get("id2_file");
    if (file2 instanceof File && file2.size > 0) id2_doc_url = await uploadFile(file2, "id2_doc");

    const resFile = fd.get("entity_resolution_file");
    if (resFile instanceof File && resFile.size > 0) entity_resolution_url = await uploadFile(resFile, "entity_resolution");

  } else {
    fields = await req.json() as Record<string, unknown>;
  }

  // Validation
  if (fields.kyc_type === "individual") {
    if (!fields.full_legal_name?.toString().trim() || !fields.date_of_birth || !fields.id_type || !fields.id_number?.toString().trim()) {
      return NextResponse.json({ error: "Please fill in your full legal name, date of birth, ID type, and ID number." }, { status: 400 });
    }
    if (fields.is_pep && !fields.pep_details?.toString().trim()) {
      return NextResponse.json({ error: "Please describe your politically exposed person status." }, { status: 400 });
    }
  } else {
    if (!fields.entity_name?.toString().trim() || !fields.entity_registration_number?.toString().trim()) {
      return NextResponse.json({ error: "Please provide the entity name and registration number." }, { status: 400 });
    }
    if (!fields.entity_beneficial_owners || (fields.entity_beneficial_owners as unknown[]).length === 0) {
      return NextResponse.json({ error: "Please list all beneficial owners with 25% or more ownership." }, { status: 400 });
    }
    if (fields.entity_has_pep_director && !fields.entity_pep_details?.toString().trim()) {
      return NextResponse.json({ error: "Please provide PEP details for the relevant director or owner." }, { status: 400 });
    }
  }

  const upsertPayload = {
    client_id: user.id,
    kyc_type: fields.kyc_type ?? "individual",
    // Individual fields
    full_legal_name: fields.full_legal_name?.toString().trim() || null,
    date_of_birth: fields.date_of_birth || null,
    nationality: fields.nationality?.toString().trim() || null,
    address: fields.address?.toString().trim() || null,
    trn: fields.trn?.toString().trim() || null,
    id_type: fields.id_type || null,
    id_number: fields.id_number?.toString().trim() || null,
    id_expiry_date: fields.id_expiry_date || null,
    ...(id_doc_url ? { id_doc_url } : {}),
    id2_type: fields.id2_type || null,
    id2_number: fields.id2_number?.toString().trim() || null,
    id2_expiry_date: fields.id2_expiry_date || null,
    ...(id2_doc_url ? { id2_doc_url } : {}),
    country_of_residence: fields.country_of_residence?.toString().trim() || null,
    occupation: fields.occupation?.toString().trim() || null,
    source_of_funds: fields.source_of_funds?.toString().trim() || null,
    source_of_wealth: fields.source_of_wealth?.toString().trim() || null,
    purpose_of_transaction: fields.purpose_of_transaction?.toString().trim() || null,
    is_pep: fields.is_pep ?? false,
    pep_details: fields.is_pep ? fields.pep_details?.toString().trim() || null : null,
    aml_declared: fields.aml_declared ?? false,
    // Entity fields
    entity_name: fields.entity_name?.toString().trim() || null,
    entity_type: fields.entity_type || null,
    entity_registration_number: fields.entity_registration_number?.toString().trim() || null,
    entity_date_of_incorporation: fields.entity_date_of_incorporation || null,
    entity_country_of_incorporation: fields.entity_country_of_incorporation?.toString().trim() || null,
    entity_registered_address: fields.entity_registered_address?.toString().trim() || null,
    entity_principal_address: fields.entity_principal_address?.toString().trim() || null,
    entity_nature_of_business: fields.entity_nature_of_business?.toString().trim() || null,
    entity_trn: fields.entity_trn?.toString().trim() || null,
    ...(entity_resolution_url ? { entity_resolution_url } : {}),
    entity_directors: fields.entity_directors ?? null,
    entity_beneficial_owners: fields.entity_beneficial_owners ?? null,
    entity_authorised_signatories: fields.entity_authorised_signatories ?? null,
    entity_has_pep_director: fields.entity_has_pep_director ?? false,
    entity_pep_details: fields.entity_has_pep_director ? fields.entity_pep_details?.toString().trim() || null : null,
    submitted_at: new Date().toISOString(),
    status: "submitted",
  };

  const { error } = await admin
    .from("fl_client_kyc")
    .upsert(upsertPayload, { onConflict: "client_id" });

  if (error) {
    console.error("[KYC POST] upsert error", { userId: user.id, code: error.code, message: error.message, details: error.details });
    return NextResponse.json({ error: "We couldn't save your information. Please check your details and try again." }, { status: 500 });
  }

  // Sync kyc_status on pending matters
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
  void pushToAdmins(`Client Intake Form (CIF) received — ${clientName}`, "Review required", "/admin?tab=clients", "fl-kyc");

  return NextResponse.json({ ok: true });
}
