/**
 * Dispatches Case Management notifications to a client and any CC contacts
 * they have configured (realtor, family member, etc.). All sends are
 * best-effort — failures never block the underlying action.
 *
 * fl_clients stores phone + notification_prefs (JSONB) which includes:
 *   milestone_updates   — email client on milestone (default true)
 *   whatsapp_updates    — WhatsApp client on milestone (default false)
 *   cc_contacts         — [{name, whatsapp?, email?}] copied on updates
 */
import { createAdminClient } from "@/lib/supabase/server";
import { sendWhatsAppText } from "@/lib/whatsapp.server";
import {
  sendNewMessageToClient,
  sendNewMessageToStaff,
  sendFileUploadedToStaff,
  sendMilestoneToCC,
} from "@/lib/email/cms";

interface CcContact {
  name: string;
  whatsapp?: string;
  email?: string;
}

interface MatterContext {
  title: string;
  clientEmail: string;
  clientName: string;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  phone: string | null;
  ccContacts: CcContact[];
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

  const { data: client } = await supabase
    .from("fl_clients")
    .select("phone, notification_prefs")
    .eq("email", user.email)
    .maybeSingle();

  const prefs = (client?.notification_prefs as Record<string, unknown>) ?? {};
  const ccContacts = (prefs.cc_contacts as CcContact[]) ?? [];

  return {
    title: (matter.title as string) || (matter.matter_type as string) || "your matter",
    clientEmail: user.email,
    clientName: (user.user_metadata?.full_name as string) || user.email.split("@")[0],
    notifyEmail: prefs.milestone_updates !== false,
    notifyWhatsapp: prefs.whatsapp_updates === true,
    phone: (client?.phone as string) ?? null,
    ccContacts,
  };
}

async function getUserIdForMatter(matterId: string, supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await supabase.from("fl_client_matters").select("client_id").eq("id", matterId).single();
  return (data?.client_id as string) ?? "";
}

async function notifyCcContacts(contacts: CcContact[], matterTitle: string, milestoneName: string) {
  for (const cc of contacts) {
    const msg = `Ferguson Law update: "${milestoneName}" is now complete on ${matterTitle}. You are receiving this because a client has added you as a notification contact.`;
    if (cc.whatsapp) {
      await sendWhatsAppText(cc.whatsapp, msg).catch(() => null);
    }
    if (cc.email) {
      await sendMilestoneToCC(cc.email, cc.name, matterTitle, milestoneName).catch(() => null);
    }
  }
}

export async function notifyMilestoneDone(matterId: string, milestoneName: string) {
  const ctx = await loadMatterContext(matterId);
  if (!ctx) return;
  const supabase = createAdminClient();

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

  if (ctx.ccContacts.length > 0) {
    await notifyCcContacts(ctx.ccContacts, ctx.title, milestoneName);
  }
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
