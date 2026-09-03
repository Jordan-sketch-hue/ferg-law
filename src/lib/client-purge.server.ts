/**
 * Client data purge / export — the single source of truth for "everywhere a
 * Ferguson Law client's data can live."
 *
 * Written after a manual purge (2026-09-03) missed two things on the first
 * pass: a legacy fl_clients/fl_client_matters row-set that isn't linked via
 * client_id (older "quick add" leads, matched by email only), and the
 * Storage objects under fl-matter-files, which aren't reachable by Postgres
 * FK cascade and can't be deleted via raw SQL (storage.protect_delete()
 * blocks it) — they have to go through the Storage API. Both admin- and
 * client-triggered deletion call this same function so the data map never
 * has to be kept in sync by hand in two places.
 *
 * client_id-linked rows (fl_client_matters.client_id -> auth.users.id, and
 * everything hanging off that matter) are cleaned up automatically by
 * Postgres FK cascades the moment auth.users is deleted — so this function
 * deletes the *legacy, email-matched* rows first, then Storage objects,
 * then the auth user last (which cascades the rest).
 */
import { createAdminClient } from "@/lib/supabase/server";

export interface PurgeSummary {
  clientEmail: string;
  clientId: string | null;
  matterIds: string[];
  deleted: Record<string, number>;
  storageFilesDeleted: number;
  authUserDeleted: boolean;
}

/**
 * Deletes every trace of a client, given their auth user id (preferred) and/or
 * email. Idempotent — safe to call twice; the second call just finds nothing.
 */
export async function purgeClientData(opts: {
  clientId?: string | null;
  email: string;
}): Promise<PurgeSummary> {
  const admin = createAdminClient();
  const email = opts.email.trim().toLowerCase();
  const deleted: Record<string, number> = {};
  let storageFilesDeleted = 0;

  const bump = (table: string, count: number | null | undefined) => {
    deleted[table] = (deleted[table] ?? 0) + (count ?? 0);
  };

  // 1. Find every matter tied to this client — by client_id (if we have one)
  //    OR by email (covers legacy client_id=null rows entered by staff).
  const matterFilters: string[] = [];
  if (opts.clientId) matterFilters.push(`client_id.eq.${opts.clientId}`);
  matterFilters.push(`client_email.eq.${email}`);

  const { data: matters } = await admin
    .from("fl_client_matters")
    .select("id")
    .or(matterFilters.join(","));
  const matterIds = (matters ?? []).map(m => m.id as string);

  // 2. Matter-scoped children, deepest first.
  if (matterIds.length > 0) {
    const { count: milestoneCount } = await admin.from("fl_matter_milestones").delete({ count: "exact" }).in("matter_id", matterIds);
    bump("fl_matter_milestones", milestoneCount);

    const { count: messageCount } = await admin.from("fl_matter_messages").delete({ count: "exact" }).in("matter_id", matterIds);
    bump("fl_matter_messages", messageCount);

    const { count: fileRowCount } = await admin.from("fl_matter_files").delete({ count: "exact" }).in("matter_id", matterIds);
    bump("fl_matter_files", fileRowCount);

    const { count: paymentCount } = await admin.from("fl_matter_payments").delete({ count: "exact" }).in("matter_id", matterIds);
    bump("fl_matter_payments", paymentCount);
  }

  // 3. KYC (client_id-keyed only — legacy email-only clients never had KYC).
  if (opts.clientId) {
    const { count } = await admin.from("fl_client_kyc").delete({ count: "exact" }).eq("client_id", opts.clientId);
    bump("fl_client_kyc", count);

    const { count: contactCount } = await admin.from("fl_client_contacts").delete({ count: "exact" }).eq("client_id", opts.clientId);
    bump("fl_client_contacts", contactCount);
  }

  // 4. The matters themselves (email-matched ones; client_id-linked ones are
  //    about to cascade away with the auth user, but deleting them here too
  //    is harmless and keeps this function correct even if called standalone).
  if (matterIds.length > 0) {
    const { count } = await admin.from("fl_client_matters").delete({ count: "exact" }).in("id", matterIds);
    bump("fl_client_matters", count);
  }

  // 5. Legacy fl_clients "lead" rows (client_id=null path) matched by email.
  {
    const { count } = await admin.from("fl_clients").delete({ count: "exact" }).eq("email", email);
    bump("fl_clients", count);
  }

  // 6. Appointments + email log, matched by email (no client_id column on either).
  {
    const { count } = await admin.from("appointments").delete({ count: "exact" }).eq("email", email);
    bump("appointments", count);
  }
  {
    const { count } = await admin.from("fl_email_log").delete({ count: "exact" }).eq("to_email", email);
    bump("fl_email_log", count);
  }

  // 7. Storage — must go through the Storage API, not SQL. Two known path
  //    shapes: kyc/{client_id}/... and matters/{matter_id}/...
  const pathsToRemove: string[] = [];
  if (opts.clientId) {
    const { data: kycFiles } = await admin.storage.from("fl-matter-files").list(`kyc/${opts.clientId}`);
    for (const f of kycFiles ?? []) pathsToRemove.push(`kyc/${opts.clientId}/${f.name}`);
  }
  for (const matterId of matterIds) {
    const { data: matterFiles } = await admin.storage.from("fl-matter-files").list(`matters/${matterId}`);
    for (const f of matterFiles ?? []) pathsToRemove.push(`matters/${matterId}/${f.name}`);
  }
  if (pathsToRemove.length > 0) {
    const { data: removed } = await admin.storage.from("fl-matter-files").remove(pathsToRemove);
    storageFilesDeleted = removed?.length ?? 0;
  }

  // 8. The auth user last — cascades identities/sessions/refresh tokens/mfa,
  //    and (via the FK on fl_client_matters.client_id) any matter that was
  //    linked that way, plus its milestones/messages/files/payments.
  let authUserDeleted = false;
  if (opts.clientId) {
    const { error } = await admin.auth.admin.deleteUser(opts.clientId);
    authUserDeleted = !error;
  }

  return {
    clientEmail: email,
    clientId: opts.clientId ?? null,
    matterIds,
    deleted,
    storageFilesDeleted,
    authUserDeleted,
  };
}

/** Logs the purge to fl_data_deletions. Call this AFTER purgeClientData succeeds. */
export async function logDataDeletion(
  summary: PurgeSummary,
  requestedBy: "client" | "admin",
  requestedByLabel?: string,
) {
  const admin = createAdminClient();
  await admin.from("fl_data_deletions").insert({
    client_email: summary.clientEmail,
    client_id: summary.clientId,
    requested_by: requestedBy,
    requested_by_label: requestedByLabel ?? null,
    summary: {
      matter_ids: summary.matterIds,
      deleted: summary.deleted,
      storage_files_deleted: summary.storageFilesDeleted,
      auth_user_deleted: summary.authUserDeleted,
    },
  });
}

/** Right-to-access companion: everything this function would otherwise delete, as JSON. */
export async function exportClientData(opts: { clientId?: string | null; email: string }) {
  const admin = createAdminClient();
  const email = opts.email.trim().toLowerCase();

  const matterFilters: string[] = [];
  if (opts.clientId) matterFilters.push(`client_id.eq.${opts.clientId}`);
  matterFilters.push(`client_email.eq.${email}`);

  const { data: matters } = await admin.from("fl_client_matters").select("*").or(matterFilters.join(","));
  const matterIds = (matters ?? []).map(m => m.id as string);

  const [clients, kyc, contacts, appointments, milestones, messages, files, payments] = await Promise.all([
    admin.from("fl_clients").select("*").eq("email", email),
    opts.clientId ? admin.from("fl_client_kyc").select("*").eq("client_id", opts.clientId) : Promise.resolve({ data: [] }),
    opts.clientId ? admin.from("fl_client_contacts").select("*").eq("client_id", opts.clientId) : Promise.resolve({ data: [] }),
    admin.from("appointments").select("*").eq("email", email),
    matterIds.length ? admin.from("fl_matter_milestones").select("*").in("matter_id", matterIds) : Promise.resolve({ data: [] }),
    matterIds.length ? admin.from("fl_matter_messages").select("*").in("matter_id", matterIds) : Promise.resolve({ data: [] }),
    matterIds.length ? admin.from("fl_matter_files").select("*").in("matter_id", matterIds) : Promise.resolve({ data: [] }),
    matterIds.length ? admin.from("fl_matter_payments").select("*").in("matter_id", matterIds) : Promise.resolve({ data: [] }),
  ]);

  return {
    exported_at: new Date().toISOString(),
    email,
    client_id: opts.clientId ?? null,
    fl_clients: clients.data ?? [],
    fl_client_matters: matters ?? [],
    fl_client_kyc: kyc.data ?? [],
    fl_client_contacts: contacts.data ?? [],
    appointments: appointments.data ?? [],
    fl_matter_milestones: milestones.data ?? [],
    fl_matter_messages: messages.data ?? [],
    fl_matter_files: files.data ?? [],
    fl_matter_payments: payments.data ?? [],
  };
}
