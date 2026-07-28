/**
 * Dispatches a Case Management notification to a client on whichever
 * channel(s) they've opted into (fl_client_contacts). Email always has a
 * usable address (auth.users.email); WhatsApp only fires if the client has
 * supplied a phone number and turned the toggle on. Both are best-effort —
 * a notification failure never blocks the underlying action that triggered it.
 */
import { createAdminClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp.server";
import {
  sendNewMessageToClient,
  sendNewMessageToStaff,
  sendFileUploadedToStaff,
} from "@/lib/email/cms";

interface MatterContext {
  title: string;
  clientEmail: string;
  clientName: string;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  phone: string | null;
}

async function loadMatterContext(matterId: string): Promise<MatterContext | null> {
  const supabase = createAdminClient();
  const { data: matter } = await supabase
    .from("fl_client_matters")
    .select("title, matter_type, client_id")
    .eq("id", matterId)
    .single();
  if (!matter) return null;

  const { data: userRes } = await supabase.auth.admin.getUserById(matter.client_id as string);
  const user = userRes?.user;
  if (!user?.email) return null;

  const { data: contact } = await supabase
    .from("fl_client_contacts")
    .select("phone, notify_email, notify_whatsapp")
    .eq("client_id", matter.client_id as string)
    .maybeSingle();

  return {
    title: (matter.title as string) || (matter.matter_type as string) || "your matter",
    clientEmail: user.email,
    clientName: (user.user_metadata?.full_name as string) || user.email.split("@")[0],
    notifyEmail: contact?.notify_email ?? true,
    notifyWhatsapp: contact?.notify_whatsapp ?? false,
    phone: (contact?.phone as string) ?? null,
  };
}

export async function notifyMilestoneDone(matterId: string, milestoneName: string) {
  const ctx = await loadMatterContext(matterId);
  if (!ctx) return;
  const supabase = createAdminClient();

  // In-app notification (no per-milestone email — weekly digest handles email)
  const userId = await getUserIdForMatter(matterId, supabase);
  if (userId) {
    await supabase.rpc("fl_notify_client", {
      p_user_id: userId,
      p_matter_id: matterId,
      p_title: "Matter update",
      p_body: `"${milestoneName}" has been completed on ${ctx.title}.`,
    });
  }

  if (ctx.notifyWhatsapp && ctx.phone) {
    await sendWhatsAppText(
      ctx.phone,
      `Ferguson Law update on ${ctx.title}: "${milestoneName}" is now complete. Log in to your client portal for the full timeline.`,
    ).catch(() => null);
  }
}

async function getUserIdForMatter(matterId: string, supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await supabase.from("fl_client_matters").select("client_id").eq("id", matterId).single();
  return (data?.client_id as string) ?? "";
}

export async function notifyNewMessageToClient(matterId: string) {
  const ctx = await loadMatterContext(matterId);
  if (!ctx) return;
  if (ctx.notifyEmail) await sendNewMessageToClient(ctx.clientEmail, ctx.title).catch(() => null);
  if (ctx.notifyWhatsapp && ctx.phone) {
    await sendWhatsAppText(ctx.phone, `Ferguson Law sent you a new message on ${ctx.title}. Check your client portal.`).catch(() => null);
  }
}

export async function notifyNewMessageToStaff(matterId: string) {
  const ctx = await loadMatterContext(matterId);
  if (!ctx) return;
  await sendNewMessageToStaff(ctx.title, ctx.clientName).catch(() => null);
}

export async function notifyFileUploadedToStaff(matterId: string, fileName: string) {
  const ctx = await loadMatterContext(matterId);
  if (!ctx) return;
  await sendFileUploadedToStaff(ctx.title, ctx.clientName, fileName).catch(() => null);
}
