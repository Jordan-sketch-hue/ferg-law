"use client";

/**
 * Consultation CRM — the Ferguson Law back office.
 *
 * One pane of glass over every lead, booking and chat. Reads/writes go through
 * the token-gated SECURITY DEFINER RPCs using the browser anon client — there
 * is NO service-role key in the browser. The shared admin token (verified
 * server-side by public.fl_is_admin) is the gate; we keep it in localStorage
 * and pass it as the `p_token` arg on every call.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { waLink, waLinkTo } from "@/lib/site";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import SiteContentTab from "@/components/admin/SiteContentTab";
import EbookLeadsTab from "@/components/admin/EbookLeadsTab";
import AttentionOverview, { AttentionBadge } from "@/components/admin/AttentionOverview";
import AppointmentAttentionPanel from "@/components/admin/AppointmentAttentionPanel";
import { computeAttentionStatus, type AttentionStatus } from "@/lib/attention/status";
import AdminPushBell from "@/components/admin/AdminPushBell";

const TOKEN_KEY = "fl_admin_token";
const TZ = "America/Jamaica";

// Brand palette (declared here so sub-components can reference them)
const GREEN = "#102A1E";
const GOLD = "#C8A65C";
const CREAM = "#F6F2EA";
const INK = "#24211b";
const MUTED = "#69736d";

// HomeReady Supabase (read + approve professionals from the H.O.M.E. platform)
const HR_URL = "https://ibtadbwtrxglujkzqofs.supabase.co";
const HR_KEY = "sb_publishable_jD87Xp8vpaFIZjo3Ez_DlA_BlTgBRSi";
const HR_BASE = "https://home.fergusonlawja.com";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------
type LeadStatus = "new" | "contacted" | "closed";
type ApptStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

interface Lead {
  id: string;
  created_at: string;
  source: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  ref: string | null;
  status: string | null;
}

interface Appointment {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  service: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
  ref: string | null;
  meta?: { meeting_url?: string | null; zoom_url?: string | null } | null;
  payment_status?: string | null;
  reminded_24h?: boolean;
  reminded_2h?: boolean;
  reminded_1h?: boolean;
  reminded_15m?: boolean;
}

interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string | null;
  status: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  last_message: string | null;
}

interface Invite {
  code: string;
  label: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

interface Listing {
  id: string;
  created_at: string;
  status: string | null;
  kind: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  parishes: string[] | null;
  bio: string | null;
  slug: string | null;
  featured: boolean;
}

interface Client {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  client_type: string | null;
  country_of_residence: string | null;
  preferred_contact: string | null;
  preferred_timezone: string | null;
  notes: string | null;
  status: string;
  meta: Record<string, unknown>;
}

interface Matter {
  id: string;
  created_at: string;
  client_id: string | null;
  client_name: string | null;
  ref: string;
  matter_type: string | null;
  stage: string;
  property_address: string | null;
  title_type: string | null;
  nht_eligible: boolean | null;
  estate_value_jmd: number | null;
  executor_name: string | null;
  business_type: string | null;
  transaction_value_jmd: number | null;
  description: string | null;
  priority: string;
  payment_status: string;
  assigned_ref: string | null;
  notes: string | null;
  closed_at: string | null;
  meta: Record<string, unknown>;
}

interface Milestone {
  id: string;
  matter_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  completed_at: string | null;
  notify_client: boolean;
  created_at: string;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  active: boolean;
}

interface HomePro {
  user_id: string;
  created_at: string;
  business_name: string | null;
  profession: string;
  phone: string | null;
  parishes: string[] | null;
  license_number: string | null;
  verified: boolean;
  headline: string | null;
}

interface HomeProperty {
  id: string;
  created_at: string;
  title: string;
  parish: string;
  price_jmd: number;
  realtor_id: string;
  status: string;
}

type Tab = "overview" | "leads" | "bookings" | "clients" | "matters" | "cms" | "calendar" | "chats" | "invites" | "directory" | "availability" | "home_pros" | "home_listings" | "email" | "inquiries" | "referrals" | "recycle_bin" | "workflows" | "zoom" | "feedback" | "analytics" | "ebook_leads" | "site_content";
// ── Admin tab groups ──────────────────────────────────────────────────────────
type TabGroup = "dashboard" | "crm" | "email" | "directory" | "home";
const TAB_GROUPS: Record<TabGroup, { label: string; tabs: Tab[] }> = {
  dashboard: { label: "Dashboard", tabs: ["overview","analytics","calendar","zoom","site_content"] },
  crm:       { label: "CRM",       tabs: ["leads","bookings","clients","matters","chats","cms","ebook_leads"] },
  email:     { label: "Email",     tabs: ["email","feedback"] },
  directory: { label: "Directory", tabs: ["invites","directory","availability","referrals","workflows"] },
  home:      { label: "H.O.M.E.", tabs: ["home_pros","home_listings","inquiries","recycle_bin"] },
};
const GROUP_ICONS = {
  dashboard: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  crm:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  email:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  directory: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></svg>,
  home:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
};
function tabToGroup(t: Tab): TabGroup {
  for (const [g, { tabs }] of Object.entries(TAB_GROUPS) as [TabGroup, { label: string; tabs: Tab[] }][]) {
    if ((tabs as string[]).includes(t)) return g;
  }
  return "dashboard";
}

interface BinItem {
  id: string;
  source_table: string;
  source_id: string;
  label: string | null;
  record_data: Record<string, unknown>;
  deleted_at: string;
  days_left: number;
}

interface InboundEmail {
  id: string;
  email_id?: string | null;
  created_at: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  reply_to: string | null;
  thread_id: string | null;
  read: boolean;
  replied: boolean;
  is_spam: boolean;
}

interface HomeInquiry {
  id: string;
  created_at: string;
  property_id: string | null;
  property_title: string | null;
  from_name: string | null;
  from_email: string | null;
  from_phone: string | null;
  message: string | null;
  status: string;
}

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "closed"];
const APPT_STATUSES: ApptStatus[] = ["pending", "confirmed", "cancelled", "completed", "no_show"];
const MATTER_STAGES = ["intake", "active", "on_hold", "closed"];
const PAYMENT_STATUSES = ["unpaid", "deposit_paid", "paid"];
const CLIENT_TYPES = ["individual", "corporate", "diaspora"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return formatInTimeZone(new Date(iso), TZ, "d MMM yyyy, h:mm a"); } catch { return iso; }
}
function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  try { return formatInTimeZone(new Date(iso), TZ, "EEE d MMM yyyy · h:mm a"); } catch { return iso; }
}
function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try { return formatInTimeZone(new Date(iso), TZ, "h:mm a"); } catch { return iso; }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [loginMode, setLoginMode] = useState<"account" | "code">("code");
  const [emailInput, setEmailInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [group, setGroup] = useState<TabGroup>("dashboard");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [homePros, setHomePros] = useState<HomePro[]>([]);
  const [homeListings, setHomeListings] = useState<HomeProperty[]>([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [inquiries, setInquiries] = useState<HomeInquiry[]>([]);
  const [binItems, setBinItems] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cmsUnread, setCmsUnread] = useState(0);
  const [seenCounts, setSeenCounts] = useState<Partial<Record<Tab, number>>>(() => {
    try { return JSON.parse(localStorage.getItem("fl_admin_seen") ?? "{}") as Partial<Record<Tab, number>>; } catch { return {}; }
  });

  // Verify stored token on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem(TOKEN_KEY); } catch { stored = null; }
      if (stored) {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("fl_is_admin", { p_token: stored });
        console.log("[admin-auth] fl_is_admin result:", { data, error, stored });
        if (cancelled) return;
        if (!error && !!data) { setToken(stored); }
        else { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }
      } else {
        await Promise.resolve();
        if (cancelled) return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const submitCode = useCallback(async () => {
    const candidate = codeInput.trim();
    if (!candidate || verifying) return;
    setVerifying(true); setAuthError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("fl_is_admin", { p_token: candidate });
    console.log("[admin-auth] submitCode result:", { data, error, candidate });
    if (!error && !!data) {
      try { localStorage.setItem(TOKEN_KEY, candidate); } catch { /* ignore */ }
      setToken(candidate); setCodeInput("");
    } else { setAuthError("That access code was not recognised."); }
    setVerifying(false);
  }, [codeInput, verifying]);

  const submitLogin = useCallback(async () => {
    const em = emailInput.trim();
    if (!em || !pwInput || verifying) return;
    setVerifying(true); setAuthError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("fl_admin_login", { p_email: em, p_password: pwInput });
    if (!error && typeof data === "string") {
      try { localStorage.setItem(TOKEN_KEY, data); } catch { /* ignore */ }
      setAccountEmail(em.toLowerCase()); setToken(data); setPwInput("");
    } else { setAuthError("Email or password is incorrect."); }
    setVerifying(false);
  }, [emailInput, pwInput, verifying]);

  useEffect(() => {
    if (!token) { setAccountEmail(null); return; }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("fl_admin_whoami", { p_token: token });
      if (!cancelled && typeof data === "string" && data) setAccountEmail(data);
    })();
    return () => { cancelled = true; };
  }, [token]);


  const fetchAll = useCallback(async (tok: string) => {
    const supabase = createClient();
    const [leadsRes, apptsRes, convosRes, invitesRes, listingsRes, clientsRes, mattersRes, availRes] =
      await Promise.all([
        supabase.rpc("fl_admin_leads", { p_token: tok }),
        supabase.rpc("fl_admin_appointments", { p_token: tok }),
        supabase.rpc("fl_admin_conversations", { p_token: tok }),
        supabase.rpc("fl_admin_list_invites", { p_token: tok }),
        supabase.rpc("fl_admin_partners", { p_token: tok }),
        supabase.rpc("fl_admin_clients", { p_token: tok }),
        supabase.rpc("fl_admin_cms_matters", { p_token: tok }),
        supabase.rpc("fl_admin_get_availability", { p_token: tok }),
      ]);
    const [emailsRes, inquiriesRes, binRes] = await Promise.all([
      supabase.rpc("fl_admin_emails", { p_token: tok }),
      supabase.rpc("fl_admin_home_inquiries", { p_token: tok }),
      supabase.rpc("fl_admin_get_recycle_bin", { p_token: tok }),
    ]);
    const firstError = leadsRes.error || apptsRes.error || convosRes.error ||
      invitesRes.error || listingsRes.error || null;
    return {
      error: firstError ? firstError.message || "Could not load data." : null,
      leads: (leadsRes.data as Lead[] | null) ?? [],
      appts: (apptsRes.data as Appointment[] | null) ?? [],
      convos: (convosRes.data as Conversation[] | null) ?? [],
      invites: (invitesRes.data as Invite[] | null) ?? [],
      listings: (listingsRes.data as Listing[] | null) ?? [],
      clients: (clientsRes.data as Client[] | null) ?? [],
      matters: ((mattersRes.data as CmsMatter[] | null) ?? []).map(cm => ({
        id: cm.id, created_at: cm.created_at, client_id: cm.client_id,
        client_name: cm.client_name, ref: cm.title || cm.matter_type || "",
        matter_type: cm.matter_type, stage: cm.status,
        description: cm.notes, notes: cm.notes, priority: "normal",
        payment_status: "unpaid", property_address: null, title_type: null,
        nht_eligible: null, estate_value_jmd: null, executor_name: null,
        business_type: null, transaction_value_jmd: null,
        assigned_ref: null, closed_at: null, meta: {},
      } as Matter)),
      availability: (availRes.data as Availability[] | null) ?? [],
      emails: (emailsRes.data as InboundEmail[] | null) ?? [],
      inquiries: (inquiriesRes.data as HomeInquiry[] | null) ?? [],
      binItems: (binRes.data as BinItem[] | null) ?? [],
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true); setLoadError(null);
    const res = await fetchAll(token);
    if (res.error) { setLoadError(res.error); } else {
      setLeads(res.leads); setAppts(res.appts); setConvos(res.convos);
      setInvites(res.invites); setListings(res.listings);
      setClients(res.clients); setMatters(res.matters); setAvailability(res.availability);
      setEmails(res.emails); setInquiries(res.inquiries); setBinItems(res.binItems);
    }
    setLoading(false);
  }, [token, fetchAll]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      const [res, unreadRes] = await Promise.all([
        fetchAll(token),
        fetch(`/api/admin/cms/unread-count?token=${encodeURIComponent(token)}`).then(r => r.json()).catch(() => ({ count: 0 })),
      ]);
      if (cancelled) return;
      if (res.error) { setLoadError(res.error); } else {
        setLeads(res.leads); setAppts(res.appts); setConvos(res.convos);
        setInvites(res.invites); setListings(res.listings);
        setClients(res.clients); setMatters(res.matters); setAvailability(res.availability);
        setEmails(res.emails); setInquiries(res.inquiries); setBinItems(res.binItems);
      }
      setCmsUnread((unreadRes as { count?: number }).count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [token, fetchAll]);

  // Realtime subscription — re-fetch partner/home-pro queues instantly on any change
  useEffect(() => {
    if (!token) return;
    if (tab !== "directory" && tab !== "home_pros") return;
    const supabase = createClient();
    const hdrs = { "apikey": HR_KEY, "Authorization": `Bearer ${HR_KEY}` };

    async function refetch() {
      if (tab === "directory") {
        const res = await supabase.rpc("fl_admin_partners", { p_token: token });
        if (res.data) setListings(res.data as Listing[]);
      }
      if (tab === "home_pros") {
        const res = await fetch(`${HR_URL}/rest/v1/home_professional_profiles?verified=eq.false&order=created_at.desc`, { headers: hdrs });
        const pros = await res.json().catch(() => null);
        if (Array.isArray(pros)) setHomePros(pros as HomePro[]);
      }
    }

    const channel = supabase
      .channel("partner-queue-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "fl_partners" }, () => void refetch())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [token, tab]);

  // Per-tab refresh — re-fetch stale data whenever the admin switches to a key tab
  useEffect(() => {
    if (!token) return;
    const supabase = createClient();
    void (async () => {
      if (tab === "bookings") {
        const { data } = await supabase.rpc("fl_admin_appointments", { p_token: token });
        if (data) setAppts(data as Appointment[]);
      } else if (tab === "matters") {
        const { data } = await supabase.rpc("fl_admin_cms_matters", { p_token: token });
        if (data) setMatters(((data as CmsMatter[]) ?? []).map(cm => ({
          id: cm.id, created_at: cm.created_at, client_id: cm.client_id,
          client_name: cm.client_name, ref: cm.title || cm.matter_type || "",
          matter_type: cm.matter_type, stage: cm.status,
          description: cm.notes, notes: cm.notes, priority: "normal",
          payment_status: "unpaid", property_address: null, title_type: null,
          nht_eligible: null, estate_value_jmd: null, executor_name: null,
          business_type: null, transaction_value_jmd: null,
          assigned_ref: null, closed_at: null, meta: {},
        } as Matter)));
      } else if (tab === "chats") {
        const { data } = await supabase.rpc("fl_admin_conversations", { p_token: token });
        if (data) setConvos(data as Conversation[]);
      } else if (tab === "leads") {
        const { data } = await supabase.rpc("fl_admin_leads", { p_token: token });
        if (data) setLeads(data as Lead[]);
      } else if (tab === "clients") {
        const { data } = await supabase.rpc("fl_admin_clients", { p_token: token });
        if (data) setClients(data as Client[]);
      } else if (tab === "email") {
        const { data } = await supabase.rpc("fl_admin_emails", { p_token: token });
        if (data) setEmails(data as InboundEmail[]);
      }
    })();
  }, [tab, token]);

  // Email tab polling — auto-refresh every 60 s while the email tab is active
  useEffect(() => {
    if (!token || tab !== "email") return;
    const supabase = createClient();
    const poll = setInterval(async () => {
      const { data } = await supabase.rpc("fl_admin_emails", { p_token: token });
      if (data) setEmails(data as InboundEmail[]);
    }, 60_000);
    return () => clearInterval(poll);
  }, [tab, token]);

  // Mutations
  const setLeadStatus = useCallback(async (id: string, status: string) => {
    if (!token) return;
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    const supabase = createClient();
    await supabase.rpc("fl_admin_set_lead_status", { p_token: token, p_id: id, p_status: status });
  }, [token]);

  const setApptStatus = useCallback(async (id: string, status: string) => {
    if (!token) return;
    setAppts((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    const supabase = createClient();
    await supabase.rpc("fl_admin_set_appointment_status", { p_token: token, p_id: id, p_status: status });
  }, [token]);

  const setListingStatus = useCallback(async (id: string, status: string) => {
    if (!token) return;
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    const supabase = createClient();
    await supabase.rpc("fl_admin_set_partner_status", { p_token: token, p_id: id, p_status: status });
  }, [token]);

  const setMatterStage = useCallback(async (id: string, stage: string) => {
    if (!token) return;
    setMatters((prev) => prev.map((m) => m.id === id ? { ...m, stage } : m));
    const supabase = createClient();
    await supabase.rpc("fl_admin_cms_update_matter_status", { p_token: token, p_matter_id: id, p_status: stage });
  }, [token]);

  const setMatterPayment = useCallback(async (id: string, payment_status: string) => {
    if (!token) return;
    setMatters((prev) => prev.map((m) => m.id === id ? { ...m, payment_status } : m));
    const supabase = createClient();
    await supabase.rpc("fl_admin_set_matter_payment", { p_token: token, p_id: id, p_status: payment_status });
  }, [token]);

  const deleteMatter = useCallback(async (id: string) => {
    if (!token || !confirm('Delete this matter? This cannot be undone.')) return;
    setMatters((prev) => prev.filter((m) => m.id !== id));
    const supabase = createClient();
    await supabase.rpc('fl_admin_delete_matter', { p_token: token, p_id: id });
  }, [token]);

  const upsertClient = useCallback(async (fields: {
    name: string; email: string; phone: string; type: string; country: string; notes: string;
  }): Promise<string | null> => {
    if (!token) return "Not authorised.";
    const supabase = createClient();
    const isNew = fields.email
      ? !clients.some((c) => c.email?.toLowerCase() === fields.email.toLowerCase())
      : true;
    const { error } = await supabase.rpc("fl_admin_upsert_client", {
      p_token: token, p_name: fields.name, p_email: fields.email || null,
      p_phone: fields.phone || null, p_type: fields.type || "individual",
      p_country: fields.country || null, p_notes: fields.notes || null,
    });
    if (error) return error.message || "Could not save client.";
    const list = await supabase.rpc("fl_admin_clients", { p_token: token });
    if (list.data) setClients(list.data as Client[]);
    if (isNew && fields.email) {
      void fetch("/api/admin/cms/invite-client", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ email: fields.email.trim().toLowerCase(), clientName: fields.name.trim() }),
      }).catch(() => null);
    }
    return null;
  }, [token, clients]);

  const saveAvailability = useCallback(async (row: Availability): Promise<string | null> => {
    if (!token) return "Not authorised.";
    const supabase = createClient();
    const { error } = await supabase.rpc("fl_admin_set_availability", {
      p_token: token, p_day: row.day_of_week,
      p_start: row.start_time, p_end: row.end_time,
      p_duration: row.slot_duration_minutes, p_active: row.active,
    });
    if (error) return error.message || "Could not save.";
    const list = await supabase.rpc("fl_admin_get_availability", { p_token: token });
    setAvailability((list.data as Availability[] | null) ?? []);
    return null;
  }, [token]);

  const createInvite = useCallback(async (args: {
    code: string; label: string; maxUses: number; expires: string | null;
  }): Promise<string | null> => {
    if (!token) return "Not authorised.";
    const supabase = createClient();
    const { error } = await supabase.rpc("fl_admin_create_invite", {
      p_token: token, p_code: args.code, p_label: args.label || null,
      p_max_uses: args.maxUses, p_expires: args.expires ? new Date(args.expires).toISOString() : null,
    });
    if (error) return error.message || "Could not create invite.";
    const list = await supabase.rpc("fl_admin_list_invites", { p_token: token });
    setInvites((list.data as Invite[] | null) ?? []);
    return null;
  }, [token]);

  const deleteClient = useCallback(async (id: string) => {
    if (!token || !confirm("Archive this client? They'll move to the Recycle Bin and be permanently removed after 30 days. You can restore them anytime before then.")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_delete_client", { p_token: token, p_id: id });
    setClients((prev) => prev.filter((c) => c.id !== id));
    setMatters((prev) => prev.filter((m) => m.client_id !== id));
  }, [token]);

  const deleteLead = useCallback(async (id: string) => {
    if (!token || !confirm("Archive this lead? They'll move to the Recycle Bin and be permanently removed after 30 days. You can restore them anytime before then.")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_delete_lead", { p_token: token, p_id: id });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, [token]);

  const cancelBooking = useCallback(async (id: string) => {
    if (!token || !confirm("Cancel this booking? The client will be emailed.")) return;
    setAppts((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
    await fetch("/api/admin/zoom/cancel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, id }),
    });
  }, [token]);

  const deactivateInvite = useCallback(async (code: string) => {
    if (!token) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_deactivate_invite", { p_token: token, p_code: code });
    setInvites((prev) => prev.map((iv) => iv.code === code ? { ...iv, active: false } : iv));
  }, [token]);

  const deleteInvite = useCallback(async (code: string) => {
    if (!token || !confirm("Delete this invite link?")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_delete_invite", { p_token: token, p_code: code });
    setInvites((prev) => prev.filter((iv) => iv.code !== code));
  }, [token]);

  const restoreFromBin = useCallback(async (binId: string) => {
    if (!token) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("fl_admin_restore_from_bin", { p_token: token, p_bin_id: binId });
    if (error) { alert("Restore failed: " + error.message); return; }
    setBinItems((prev) => prev.filter((b) => b.id !== binId));
    void refresh();
  }, [token, refresh]);

  const purgeFromBin = useCallback(async (binId: string) => {
    if (!token || !confirm("Permanently delete this item? It cannot be recovered.")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_purge_from_bin", { p_token: token, p_bin_id: binId });
    setBinItems((prev) => prev.filter((b) => b.id !== binId));
  }, [token]);

  // H.O.M.E. data — fetched directly from the homeready Supabase project
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      setHomeLoading(true);
      try {
        const hdrs = { "apikey": HR_KEY, "Authorization": `Bearer ${HR_KEY}` };
        const [prosRes, propsRes] = await Promise.all([
          fetch(`${HR_URL}/rest/v1/home_professional_profiles?verified=eq.false&order=created_at.desc`, { headers: hdrs }),
          fetch(`${HR_URL}/rest/v1/home_properties?status=eq.active&order=created_at.desc`, { headers: hdrs }),
        ]);
        const [pros, props] = await Promise.all([prosRes.json(), propsRes.json()]);
        if (!cancelled) {
          setHomePros(Array.isArray(pros) ? (pros as HomePro[]) : []);
          setHomeListings(Array.isArray(props) ? (props as HomeProperty[]) : []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setHomeLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const approveHomePro = useCallback(async (userId: string) => {
    setHomePros((prev) => prev.filter((p) => p.user_id !== userId));
    await fetch(`${HR_URL}/rest/v1/home_professional_profiles?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": HR_KEY,
        "Authorization": `Bearer ${HR_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ verified: true }),
    });
  }, []);

  const signOut = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    setToken(null); setLeads([]); setAppts([]); setConvos([]);
    setInvites([]); setListings([]); setClients([]); setMatters([]); setAvailability([]);
    setHomePros([]); setHomeListings([]); setEmails([]); setInquiries([]);
  }, []);


  // Role — Jordan sees everything; Owen gets a simplified label on his greeting
  const isJordan = accountEmail === "jordanrmorris01@icloud.com";

  // Badge seen — clears tab count when the tab is opened
  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    setSeenCounts(prev => {
      const rawCount =
        t === "leads" ? leads.length :
        t === "bookings" ? appts.length :
        t === "clients" ? clients.length :
        t === "matters" ? matters.length :
        t === "chats" ? convos.length :
        t === "email" ? emails.filter(e => !e.read).length :
        t === "invites" ? invites.length :
        t === "directory" ? listings.length :
        t === "availability" ? availability.length :
        t === "home_pros" ? homePros.length :
        t === "home_listings" ? homeListings.length :
        t === "inquiries" ? inquiries.filter(i => i.status === "new").length :
        t === "recycle_bin" ? binItems.length : 0;
      const next = { ...prev, [t]: rawCount };
      try { localStorage.setItem("fl_admin_seen", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [leads, appts, clients, matters, convos, emails, invites, listings, availability, homePros, homeListings, inquiries, binItems]);

  // Stats
  const newLeads = leads.filter((l) => (l.status ?? "new") === "new").length;
  const pendingBookings = appts.filter((a) => a.status === "pending").length;
  const openChats = convos.filter((c) => c.status === "waiting_agent" || c.status === "agent").length;
  const pendingListings = listings.filter((l) => (l.status ?? "pending") === "pending").length;

  // Follow-up queue — leads not contacted in 48h
  const staleLeads = leads.filter((l) => {
    if ((l.status ?? "new") !== "new") return false;
    return Date.now() - new Date(l.created_at).getTime() > 48 * 60 * 60 * 1000;
  });

  if (checking) {
    return (
      <div style={S.authWrap}>
        <div style={S.brandMark}>Ferguson Law</div>
        <p style={{ color: "#b9b099", marginTop: 8 }}>Loading…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={S.authWrap}>
        <div style={S.authCard}>
          <div style={S.brandMark}>Ferguson Law</div>
          <h1 style={S.authTitle}>Back office</h1>
          {loginMode === "account" ? (
            <>
              <p style={S.authSub}>Sign in to continue.</p>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submitLogin()} placeholder="Email"
                style={S.authInput} aria-label="Email" autoComplete="username" autoFocus />
              <div style={{ position: "relative", marginTop: 10 }}>
                <input type={showPw ? "text" : "password"} value={pwInput} onChange={(e) => setPwInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submitLogin()} placeholder="Password"
                  style={{ ...S.authInput, marginTop: 0, width: "100%", boxSizing: "border-box", paddingRight: 40 }} aria-label="Password" autoComplete="current-password" />
          </div>
        )}
        {pane === "sent" ? (
          sentLoading ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: MUTED, fontSize: ".86rem" }}>Loading...</div>
          ) : sentEmails.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: MUTED, fontSize: ".86rem" }}>No sent emails yet.</div>
          ) : sentEmails.map((e) => (
            <button key={e.id} type="button" onClick={() => setSelectedSent(e)}
              style={{ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                padding: "12px 14px", background: selectedSent?.id === e.id ? "rgba(16,42,30,.06)" : "#fff",
                borderBottom: "1px solid rgba(18,16,12,.07)",
                borderLeft: selectedSent?.id === e.id ? `3px solid ${GOLD}` : "3px solid transparent" }}>
              <div style={{ fontWeight: 600, fontSize: ".85rem", color: GREEN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                To: {e.to_name || e.to_email}
              </div>
              <div style={{ fontSize: ".78rem", color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
              {e.body_preview && <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.body_preview}</div>}
              <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 2 }}>{fmtDate(e.created_at)}</div>
            </button>
          ))
        ) : (emails.filter(e => !e.is_spam)).length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: MUTED, fontSize: ".86rem" }}>"No inbound emails yet."</div>
        ) : (emails.filter(e => !e.is_spam)).map((e) => (
          <button key={e.id} type="button" onClick={() => selectEmail(e)}
            style={{ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              padding: "12px 14px", background: selected?.id === e.id ? "rgba(16,42,30,.06)" : "#fff",
              borderBottom: "1px solid rgba(18,16,12,.07)",
              borderLeft: selected?.id === e.id ? `3px solid ${GOLD}` : "3px solid transparent" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {!e.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#c0392b", flexShrink: 0, display: "inline-block" }} />}
              <span style={{ fontWeight: e.read ? 400 : 700, fontSize: ".85rem", color: GREEN, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {e.from_name || e.from_email}
              </span>
              {e.replied && <span style={{ fontSize: ".66rem", fontWeight: 700, color: "#2f7a52", background: "rgba(47,122,82,.12)", borderRadius: 999, padding: "1px 6px", flexShrink: 0 }}>Replied</span>}
            </div>
            <div style={{ fontSize: ".78rem", color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject || "(no subject)"}</div>
            <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 2 }}>{fmtDate(e.created_at)}</div>
          </button>
        ))}
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 24, display: isMobile && !selected && !composing && !selectedSent ? "none" : "block" }}>
        {isMobile && (!!selected || composing || !!selectedSent) && (
          <button type="button" onClick={() => { setSelected(null); setSelectedSent(null); setComposing(false); setSendResult(null); }}
            style={{ marginBottom: 16, padding: "8px 16px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".82rem", cursor: "pointer", color: MUTED, display: "inline-flex", alignItems: "center", gap: 6 }}>
            ← Inbox
          </button>
        )}
        {pane === "sent" && selectedSent ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.15rem", color: GREEN }}>{selectedSent.subject || "(no subject)"}</div>
              <div style={{ fontSize: ".8rem", color: MUTED, marginTop: 4 }}>
                To: <strong style={{ color: INK }}>{selectedSent.to_name ? `${selectedSent.to_name} <${selectedSent.to_email}>` : selectedSent.to_email}</strong>
                &nbsp;·&nbsp;{fmtDate(selectedSent.created_at)}
              </div>
              {selectedSent.context && <div style={{ fontSize: ".78rem", color: MUTED, marginTop: 4 }}>Context: {selectedSent.context}</div>}
              <div style={{ display: "inline-block", marginTop: 6, fontSize: ".72rem", background: "rgba(47,122,82,.1)", color: GREEN, borderRadius: 999, padding: "2px 10px" }}>{selectedSent.status}</div>
            </div>
            <div style={{ background: "#faf8f2", borderRadius: 10, padding: 20, fontSize: ".9rem", lineHeight: 1.7, color: INK, whiteSpace: "pre-wrap", minHeight: 100 }}>
              {selectedSent.body_full || selectedSent.body_preview || "(no content available)"}
            </div>
            {!selectedSent.body_full && selectedSent.body_preview && (
              <div style={{ fontSize: ".76rem", color: MUTED, marginTop: 8 }}>
                Sent before full-body logging was added — only the first 300 characters were saved for this one.
              </div>
            )}
          </div>
        ) : pane === "sent" ? (
          <div style={{ color: MUTED, textAlign: "center", paddingTop: 60 }}>Select a sent email to view</div>
        ) : composing ? (
          <div>
            <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.1rem", color: GREEN, marginBottom: 16 }}>New Email</div>
            {[["To", newTo, setNewTo, "email"], ["Subject", newSubject, setNewSubject, "text"]].map(([lbl, val, setter, t]) => (
              <div key={lbl as string} style={{ ...S.field, marginBottom: 12 }}>
                <label style={S.fieldLabel}>{lbl as string}</label>
                <input style={S.fieldInput} type={t as string} value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
              </div>
            ))}
            <div style={{ ...S.field, marginBottom: 16 }}>
              <label style={S.fieldLabel}>Message</label>
              <textarea style={{ ...S.fieldInput, resize: "vertical", minHeight: 160, fontFamily: "inherit" }}
                value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Your message…" />
            </div>
            <div style={{ ...S.field, marginBottom: 16 }}>
              <label style={S.fieldLabel}>Attachments</label>
              <input
                type="file"
                multiple
                onChange={(e) => setNewFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])}
                style={{ fontSize: ".82rem" }}
              />
              {newFiles.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {newFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".78rem", color: INK, background: "#f8f6f1", borderRadius: 6, padding: "4px 8px" }}>
                      <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
                      <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#b00", fontSize: ".78rem" }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {sendResult && <p style={{ fontSize: ".82rem", color: sendResult.ok ? "#2e7d4f" : "#a23b3b", marginBottom: 10 }}>{sendResult.msg}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => void sendCompose()} disabled={sending || !newTo.trim() || !newBody.trim()}
                style={{ ...S.authBtn, width: "auto", padding: "10px 22px", ...(sending || !newTo.trim() || !newBody.trim() ? S.btnOff : null) }}>
                {sending ? "Sending…" : "Send"}
              </button>
              <button type="button" onClick={() => { setComposing(false); setSendResult(null); setNewFiles([]); }}
                style={{ padding: "10px 18px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".88rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : !selected ? (
          <div style={{ color: MUTED, textAlign: "center", paddingTop: 60 }}>Select an email to read</div>
        ) : (
          <div>
            {isMobile && (
              <button type="button" onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: GOLD, fontWeight: 700, fontSize: ".88rem", cursor: "pointer", padding: "0 0 12px 0", display: "flex", alignItems: "center", gap: 4 }}>
                ← Inbox
              </button>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.15rem", color: GREEN }}>{selected.subject || "(no subject)"}</div>
              <div style={{ fontSize: ".8rem", color: MUTED, marginTop: 4 }}>
                From: <strong style={{ color: INK }}>{selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}</strong>
                &nbsp;·&nbsp;{fmtDate(selected.created_at)}
              </div>
              {selected.to_email && <div style={{ fontSize: ".8rem", color: MUTED }}>To: {selected.to_email}</div>}
            </div>
            <div style={{ background: "#faf8f2", borderRadius: 10, marginBottom: 20, minHeight: 100, overflow: "hidden" }}>
              {selected.body_html ? (
                <iframe
                  srcDoc={selected.body_html}
                  sandbox="allow-same-origin"
                  style={{ width: "100%", minHeight: 400, border: "none", display: "block" }}
                  title="Email body"
                  onLoad={(e) => {
                    const f = e.currentTarget;
                    try {
                      const h = f.contentDocument?.documentElement?.scrollHeight ?? f.contentDocument?.body?.scrollHeight;
                      if (h && h > 0) f.style.height = `${h + 24}px`;
                    } catch { /* cross-origin guard */ }
                  }}
                />
              ) : selected.body_text ? (
                <div style={{ padding: 20, fontSize: ".9rem", lineHeight: 1.7, color: INK, whiteSpace: "pre-wrap" }}>
                  {selected.body_text}
                </div>
              ) : editingBody ? (
                <div style={{ padding: 16 }}>
                  <textarea
                    value={bodyDraft}
                    onChange={(e) => setBodyDraft(e.target.value)}
                    rows={8}
                    placeholder="Paste the email body here…"
                    style={{ width: "100%", resize: "vertical", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)", padding: "10px 12px", fontSize: ".88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" disabled={savingBody || !bodyDraft.trim()} onClick={async () => {
                      if (!selected || savingBody || !bodyDraft.trim()) return;
                      setSavingBody(true);
                      const res = await fetch("/api/admin/set-email-body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, id: selected.id, body_text: bodyDraft.trim() }) });
                      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
                      if (json.ok) { setSelected({ ...selected, body_text: bodyDraft.trim() }); setEditingBody(false); setBodyDraft(""); }
                      setSavingBody(false);
                    }} style={{ ...S.authBtn, width: "auto", padding: "8px 18px", ...(savingBody || !bodyDraft.trim() ? S.btnOff : null) }}>
                      {savingBody ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => { setEditingBody(false); setBodyDraft(""); }} style={{ padding: "8px 16px", borderRadius: 999, border: "1px solid rgba(18,16,12,.2)", background: "#fff", fontSize: ".85rem", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: ".88rem", color: MUTED, fontStyle: "italic" }}>No body captured.</span>
                  <button type="button" onClick={() => { setEditingBody(true); setBodyDraft(""); }} style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${GOLD}`, background: "rgba(200,166,92,.08)", color: "#8a6a22", fontWeight: 600, fontSize: ".8rem", cursor: "pointer" }}>+ Add body</button>
                </div>
              )}
            </div>
            {!replyOpen ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => setReplyOpen(true)}
                  style={{ ...S.authBtn, width: "auto", padding: "9px 22px" }}>
                  Reply
                </button>
                <button type="button" onClick={() => void suggestReply()} disabled={suggesting}
                  style={{ padding: "9px 18px", borderRadius: 999, border: `1px solid ${GOLD}`, background: "rgba(200,166,92,.08)", color: "#8a6a22", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", ...(suggesting ? S.btnOff : null) }}>
                  {suggesting ? "Thinking…" : "✦ AI draft"}
                </button>
                <button type="button" onClick={() => void deleteEmail(selected)} disabled={deleting}
                  style={{ padding: "9px 16px", borderRadius: 999, border: "1px solid rgba(160,40,40,.3)", background: "rgba(180,50,50,.06)", color: "#a02828", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", marginLeft: "auto", ...(deleting ? S.btnOff : null) }}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            ) : (
              <div style={{ borderTop: "1px solid rgba(18,16,12,.1)", paddingTop: 16 }}>
                <div style={{ fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
                  Reply to {selected.reply_to || selected.from_email}
                </div>
                <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={5}
                  placeholder="Your reply…"
                  style={{ width: "100%", resize: "vertical", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", padding: "10px 12px", fontSize: ".9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                {sendResult && <p style={{ fontSize: ".82rem", color: sendResult.ok ? "#2e7d4f" : "#a23b3b", marginBottom: 8 }}>{sendResult.msg}</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => void sendReply()} disabled={sending || !replyBody.trim()}
                    style={{ ...S.authBtn, width: "auto", padding: "10px 20px", ...(sending || !replyBody.trim() ? S.btnOff : null) }}>
                    {sending ? "Sending…" : "Send reply"}
                  </button>
                  <button type="button" onClick={() => setReplyOpen(false)}
                    style={{ padding: "10px 18px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".88rem", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// H.O.M.E. Inquiries
// ---------------------------------------------------------------------------
function InquiriesTab({ inquiries, token, onStatus }: {
  inquiries: HomeInquiry[]; token: string; onStatus: (id: string, status: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    onStatus(id, status);
    const supabase = createClient();
    await supabase.rpc("fl_admin_home_inquiry_status", { p_token: token, p_id: id, p_status: status });
    setBusy(null);
  }

  if (inquiries.length === 0) return <Empty>No H.O.M.E. property inquiries yet.</Empty>;
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr><Th>Date</Th><Th>Property</Th><Th>From</Th><Th>Contact</Th><Th>Message</Th><Th>Status</Th><Th>Actions</Th></tr>
        </thead>
        <tbody>
          {inquiries.map((q) => (
            <tr key={q.id} style={S.tr}>
              <Td>{fmtDate(q.created_at)}</Td>
              <Td><span style={S.strong}>{q.property_title || "—"}</span></Td>
              <Td>{q.from_name || "—"}</Td>
              <Td>
                <div style={S.contactCol}>
                  {q.from_email && <span>{q.from_email}</span>}
                  {q.from_phone && <span style={S.muted}>{q.from_phone}</span>}
                  {!q.from_email && !q.from_phone && <span style={S.muted}>—</span>}
                </div>
              </Td>
              <Td><div style={S.msgCell} title={q.message ?? ""}>{q.message || "—"}</div></Td>
              <Td><StatusBadge status={q.status} /></Td>
              <Td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {q.status !== "contacted" && (
                    <button type="button" onClick={() => void setStatus(q.id, "contacted")} disabled={busy === q.id}
                      style={{ ...S.waBtn, background: "rgba(47,122,82,.14)", color: "#2f7a52", border: "1px solid rgba(47,122,82,.3)" }}>
                      Contacted
                    </button>
                  )}
                  {q.status !== "closed" && (
                    <button type="button" onClick={() => void setStatus(q.id, "closed")} disabled={busy === q.id}
                      style={{ ...S.waBtn, background: "rgba(18,16,12,.08)", color: MUTED, border: "1px solid rgba(18,16,12,.15)" }}>
                      Close
                    </button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------
function ReferralsTab({ leads, appts }: { leads: Lead[]; appts: Appointment[] }) {
  // Group leads by ref source
  const refMap: Record<string, { count: number; booked: number }> = {};
  for (const l of leads) {
    const src = l.ref || l.source || "direct";
    if (!refMap[src]) refMap[src] = { count: 0, booked: 0 };
    refMap[src].count++;
  }
  // Count booked per lead (match by email to avoid inflating conversions when one lead books multiple times)
  const bookedEmails = new Set(appts.map(a => a.email).filter(Boolean) as string[]);
  const counted = new Set<string>();
  for (const l of leads) {
    if (l.email && bookedEmails.has(l.email) && !counted.has(l.email)) {
      counted.add(l.email);
      const src = l.ref || l.source || "direct";
      if (refMap[src]) refMap[src].booked++;
    }
  }

  const rows = Object.entries(refMap)
    .map(([src, d]) => ({ src, ...d, pct: d.count > 0 ? Math.round((d.booked / d.count) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  if (rows.length === 0) return <Empty>No lead data yet.</Empty>;

  return (
    <div style={{ padding: 20 }}>
      <p style={{ color: MUTED, fontSize: ".84rem", marginBottom: 18 }}>
        Source attribution based on the <code>ref</code> field on leads and bookings.
      </p>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr><Th>Source / Referral</Th><Th>Leads</Th><Th>Booked</Th><Th>Conversion</Th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.src} style={S.tr}>
                <Td><span style={S.strong}>{r.src}</span></Td>
                <Td>{r.count}</Td>
                <Td>{r.booked}</Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: "rgba(18,16,12,.1)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${r.pct}%`, height: "100%", background: r.pct >= 50 ? "#2f7a52" : GOLD, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: ".82rem", color: r.pct >= 50 ? "#2f7a52" : r.pct > 0 ? "#8a6a22" : MUTED }}>{r.pct}%</span>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow Templates Tab — global step editor (affects NEW matters only)
// ---------------------------------------------------------------------------
interface WfTemplate { id: string; type: string; name: string; phases: WfPhase[]; }
interface WfPhase { name: string; order: number; milestones: string[]; }

function WorkflowTemplatesTab({ token }: { token: string }) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<WfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [addingStep, setAddingStep] = useState<{ phaseOrder: number } | null>(null);
  const [newStepName, setNewStepName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingStep, setEditingStep] = useState<{ phaseOrder: number; idx: number; value: string } | null>(null);
  const [undoStack, setUndoStack] = useState<{ phaseOrder: number; name: string; templateId: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
      setTemplates((data as WfTemplate[]) ?? []);
      if (data && (data as WfTemplate[]).length > 0) setSelected((data as WfTemplate[])[0].id);
      setLoading(false);
    })();
  }, []);

  async function addPhase() {
    if (!selected || !newPhaseName.trim() || saving) return;
    setSaving(true);
    await supabase.rpc("fl_admin_workflow_add_phase", { p_token: token, p_template_id: selected, p_phase_name: newPhaseName.trim() });
    const { data } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
    setTemplates((data as WfTemplate[]) ?? []);
    setNewPhaseName(""); setAddingPhase(false); setSaving(false);
  }

  async function addStep(phaseOrder: number) {
    if (!selected || !newStepName.trim() || saving) return;
    setSaving(true);
    await supabase.rpc("fl_admin_workflow_add_step", { p_token: token, p_template_id: selected, p_phase_order: phaseOrder, p_step_name: newStepName.trim() });
    const { data } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
    setTemplates((data as WfTemplate[]) ?? []);
    setNewStepName(""); setAddingStep(null); setSaving(false);
  }

  async function removeStep(phaseOrder: number, stepIdx: number) {
    if (!selected) return;
    const tplNow = templates.find(t => t.id === selected);
    const phase = tplNow?.phases.find(p => p.order === phaseOrder);
    const stepName = phase?.milestones[stepIdx];
    if (!stepName || !confirm("Remove this step from the global template? This won't affect existing client matters.")) return;
    await supabase.rpc("fl_admin_workflow_remove_step", { p_token: token, p_template_id: selected, p_phase_order: phaseOrder, p_step_index: stepIdx });
    const { data } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
    setTemplates((data as WfTemplate[]) ?? []);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoStack({ phaseOrder, name: stepName, templateId: selected });
    undoTimerRef.current = setTimeout(() => setUndoStack(null), 8000);
  }

  async function undoRemoveStep() {
    if (!undoStack) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    await supabase.rpc("fl_admin_workflow_add_step", { p_token: token, p_template_id: undoStack.templateId, p_phase_order: undoStack.phaseOrder, p_step_name: undoStack.name });
    const { data } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
    setTemplates((data as WfTemplate[]) ?? []);
    setUndoStack(null);
  }

  async function renameStep(phaseOrder: number, stepIdx: number, newName: string) {
    if (!selected || !newName.trim() || saving) return;
    setSaving(true);
    await supabase.rpc("fl_admin_workflow_update_step", {
      p_token: token, p_template_id: selected,
      p_phase_order: phaseOrder, p_step_index: stepIdx, p_new_name: newName.trim()
    });
    const { data } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
    setTemplates((data as WfTemplate[]) ?? []);
    setEditingStep(null); setSaving(false);
  }

  const tpl = templates.find(t => t.id === selected);

  if (loading) return <div style={{ padding: 24, color: MUTED }}>Loading templates…</div>;

  return (
    <div style={{ padding: "1.25rem" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: GREEN, marginBottom: 4 }}>Workflow Templates</div>
        <div style={{ fontSize: ".82rem", color: MUTED }}>
          Changes here affect <strong>new matters only</strong>. Existing client timelines are not modified.
        </div>
      </div>

      {/* Undo banner */}
      {undoStack && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", marginBottom: 14, borderRadius: 8, background: "#1a3a2a", color: CREAM, fontSize: 13 }}>
          <span style={{ flex: 1 }}>Step removed: <strong>"{undoStack.name}"</strong></span>
          <button type="button" onClick={() => void undoRemoveStep()}
            style={{ padding: "4px 14px", borderRadius: 6, border: "none", background: GOLD, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Undo
          </button>
          <button type="button" onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); setUndoStack(null); }}
            style={{ background: "none", border: "none", color: CREAM, opacity: 0.6, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Template picker + edit mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {templates.map(t => (
          <button key={t.id} type="button" onClick={() => { setSelected(t.id); setEditMode(false); setEditingStep(null); }}
            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${selected === t.id ? GREEN : "rgba(18,16,12,.2)"}`,
              background: selected === t.id ? GREEN : "#fff", color: selected === t.id ? CREAM : INK,
              fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {t.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {!editMode ? (
          <button type="button" onClick={() => setEditMode(true)}
            style={{ padding: "6px 16px", borderRadius: 8, border: `1px solid ${GOLD}`,
              background: "transparent", color: "#8a6a22", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ✎ Edit Template
          </button>
        ) : (
          <>
            <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>EDIT MODE — changes save immediately</span>
            <button type="button" onClick={() => { setEditMode(false); setEditingStep(null); }}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none",
                background: GREEN, color: CREAM, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              ✓ Done Editing
            </button>
          </>
        )}
      </div>

      {tpl && (
        <>
          {tpl.phases.sort((a, b) => a.order - b.order).map(phase => (
            <div key={phase.order} style={{ marginBottom: 20, border: "1px solid rgba(18,16,12,.1)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "rgba(16,42,30,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: GREEN }}>{phase.name}</span>
                {editMode && (
                  <button type="button"
                    onClick={() => { setAddingStep(addingStep?.phaseOrder === phase.order ? null : { phaseOrder: phase.order }); setNewStepName(""); }}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${GOLD}`,
                      background: addingStep?.phaseOrder === phase.order ? GOLD : "transparent",
                      color: addingStep?.phaseOrder === phase.order ? "#fff" : "#8a6a22", cursor: "pointer", fontWeight: 600 }}>
                    {addingStep?.phaseOrder === phase.order ? "Cancel" : "+ Step"}
                  </button>
                )}
              </div>
              <div style={{ padding: "8px 14px" }}>
                {phase.milestones.map((ms, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(18,16,12,.05)" }}>
                    {editMode && editingStep?.phaseOrder === phase.order && editingStep.idx === idx ? (
                      <>
                        <input autoFocus value={editingStep.value}
                          onChange={e => setEditingStep({ ...editingStep, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === "Enter") void renameStep(phase.order, idx, editingStep.value);
                            if (e.key === "Escape") setEditingStep(null);
                          }}
                          style={{ flex: 1, fontSize: 13, padding: "4px 8px", borderRadius: 6, border: `1px solid ${GOLD}`, outline: "none" }} />
                        <button type="button" onClick={() => void renameStep(phase.order, idx, editingStep.value)}
                          disabled={saving || !editingStep.value.trim()}
                          style={{ padding: "3px 10px", borderRadius: 6, border: "none", background: GREEN, color: CREAM, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                          {saving ? "…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingStep(null)}
                          style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 13, flex: 1, color: INK }}>• {ms}</span>
                        {editMode && (
                          <>
                            <button type="button"
                              onClick={() => setEditingStep({ phaseOrder: phase.order, idx, value: ms })}
                              title="Rename" style={{ background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 12, padding: "0 3px" }}>✎</button>
                            <button type="button" onClick={() => void removeStep(phase.order, idx)}
                              title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 13, padding: "0 4px" }}>✕</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {addingStep?.phaseOrder === phase.order && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input autoFocus value={newStepName} onChange={e => setNewStepName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") void addStep(phase.order); if (e.key === "Escape") { setAddingStep(null); setNewStepName(""); } }}
                      placeholder="New step name…"
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${GOLD}`, outline: "none" }} />
                    <button type="button" onClick={() => void addStep(phase.order)} disabled={saving || !newStepName.trim()}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: GREEN, color: CREAM, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving || !newStepName.trim() ? 0.5 : 1 }}>
                      {saving ? "…" : "Add"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add phase — only in edit mode */}
          {editMode && <div style={{ marginTop: 12 }}>
            {!addingPhase ? (
              <button type="button" onClick={() => setAddingPhase(true)}
                style={{ ...S.ghostBtn, border: `1px dashed ${GOLD}`, color: "#8a6a22", fontSize: 13 }}>
                + Add phase
              </button>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void addPhase(); if (e.key === "Escape") { setAddingPhase(false); setNewPhaseName(""); } }}
                  placeholder="Phase name…"
                  style={{ flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${GOLD}`, outline: "none" }} />
                <button type="button" onClick={() => void addPhase()} disabled={saving || !newPhaseName.trim()}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: GREEN, color: CREAM, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving || !newPhaseName.trim() ? 0.5 : 1 }}>
                  {saving ? "…" : "Add Phase"}
                </button>
                <button type="button" onClick={() => { setAddingPhase(false); setNewPhaseName(""); }}
                  style={{ ...S.ghostBtn, fontSize: 13 }}>Cancel</button>
              </div>
            )}
          </div>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recycle Bin Tab
// ---------------------------------------------------------------------------
const TABLE_LABEL: Record<string, string> = {
  ferguson_leads: "Lead",
  fl_clients: "Client",
  fl_client_matters: "Matter",
  appointments: "Appointment",
  fl_matter_notes: "Milestone",
};

function RecycleBinTab({ items, onRestore, onPurge }: {
  items: BinItem[];
  token: string;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: MUTED }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🗑</div>
        <div style={{ fontWeight: 600, fontSize: "1rem", color: INK }}>Recycle bin is empty</div>
        <div style={{ marginTop: 6, fontSize: ".85rem" }}>Deleted items appear here and are permanently removed after 30 days.</div>
      </div>
    );
  }
  return (
    <div style={{ padding: "1.25rem" }}>
      <div style={{ marginBottom: 16, fontSize: ".85rem", color: MUTED }}>
        Items are automatically purged 30 days after deletion. Restore or permanently delete them below.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "0.75rem 1rem", borderRadius: 10,
            border: "1px solid rgba(18,16,12,.08)", background: "#fff",
          }}>
            <span style={{
              fontSize: ".7rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 6, background: "rgba(200,166,92,.12)", color: "#8a6a22",
              whiteSpace: "nowrap",
            }}>
              {TABLE_LABEL[item.source_table] ?? item.source_table}
            </span>
            <span style={{ flex: 1, fontWeight: 500, fontSize: ".88rem", color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.label ?? "—"}
            </span>
            <span style={{ fontSize: ".78rem", color: MUTED, whiteSpace: "nowrap" }}>
              Deleted {fmtDate(item.deleted_at)}
            </span>
            <span style={{
              fontSize: ".75rem", fontWeight: 600, whiteSpace: "nowrap",
              color: item.days_left <= 5 ? "#a23b3b" : item.days_left <= 14 ? "#8a6a22" : MUTED,
            }}>
              {item.days_left}d left
            </span>
            <button type="button" onClick={() => onRestore(item.id)}
              style={{ ...S.ghostBtn, fontSize: ".78rem", padding: "4px 10px", color: "#2f7a52", border: "1px solid #2f7a52" }}>
              Restore
            </button>
            <button type="button" onClick={() => onPurge(item.id)}
              style={{ ...S.ghostBtn, fontSize: ".78rem", padding: "4px 10px", color: "#a23b3b", border: "1px solid #a23b3b" }}>
              Delete forever
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------
function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return "VIP-" + out;
}
function inviteLink(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/?invite=${encodeURIComponent(code)}`;
}

function InvitesPanel({ invites, loading, onCreate, onDeactivate, onDelete }: {
  invites: Invite[]; loading: boolean;
  onCreate: (args: { code: string; label: string; maxUses: number; expires: string | null }) => Promise<string | null>;
  onDeactivate: (code: string) => void;
  onDelete: (code: string) => void;
}) {
  const [label, setLabel] = useState(""); const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("1"); const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) setNow(Date.now()); });
    return () => { cancelled = true; };
  }, [invites]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    const finalCode = (code.trim() || randomCode()).toUpperCase();
    const uses = Math.max(1, parseInt(maxUses, 10) || 1);
    const result = await onCreate({ code: finalCode, label: label.trim(), maxUses: uses, expires: expires || null });
    if (result) { setErr(result); } else { setLabel(""); setCode(""); setMaxUses("1"); setExpires(""); }
    setBusy(false);
  }, [busy, code, maxUses, label, expires, onCreate]);

  const copy = useCallback((c: string) => {
    const link = inviteLink(c);
    try { void navigator.clipboard.writeText(link); setCopied(c); setTimeout(() => setCopied((cur) => (cur === c ? null : cur)), 1600); } catch { /* ignore */ }
  }, []);


  return (
    <div style={{ padding: 20 }}>
      <div style={S.inviteForm}>
        <div style={S.inviteFormGrid}>
          {[["Label", label, setLabel, "text", "e.g. Owen — referral"], ["Code (optional)", code, setCode, "text", "auto-generate"]].map(([lbl, val, setter, t, ph]) => (
            <div key={lbl as string} style={S.field}>
              <label style={S.fieldLabel}>{lbl as string}</label>
              <input style={S.fieldInput} type={t as string} placeholder={ph as string} value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} />
            </div>
          ))}
          <div style={S.field}><label style={S.fieldLabel}>Max uses</label><input style={S.fieldInput} type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></div>
          <div style={S.field}><label style={S.fieldLabel}>Expires (optional)</label><input style={S.fieldInput} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button type="button" onClick={() => void submit()} disabled={busy}
            style={{ ...S.authBtn, width: "auto", padding: "10px 22px", ...(busy ? S.btnOff : null) }}>
            {busy ? "Creating…" : "Create invite"}
          </button>
          {err && <span style={{ color: "#a23b3b", fontSize: ".82rem" }}>{err}</span>}
        </div>
      </div>
      {loading && invites.length === 0 ? <Empty>Loading invites…</Empty> :
        invites.length === 0 ? <Empty>No invites yet. Create one above to share a free-booking link.</Empty> : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr><Th>Code</Th><Th>Label</Th><Th>Uses</Th><Th>Expires</Th><Th>Active</Th><Th>Share link</Th><Th>Actions</Th></tr></thead>
              <tbody>
                {invites.map((iv) => {
                  const spent = iv.used_count >= iv.max_uses;
                  const expired = !!iv.expires_at && now > 0 && new Date(iv.expires_at).getTime() < now;
                  const live = iv.active && !spent && !expired;
                  return (
                    <tr key={iv.code} style={S.tr}>
                      <Td><span style={S.mono}>{iv.code}</span></Td>
                      <Td>{iv.label || "—"}</Td>
                      <Td><span style={spent ? S.muted : S.strong}>{iv.used_count}/{iv.max_uses}</span></Td>
                      <Td>{iv.expires_at ? fmtDate(iv.expires_at) : "Never"}</Td>
                      <Td><span style={{ ...S.statusBadge, ...(live ? { background: "rgba(47,122,82,.16)", color: "#2f7a52" } : { background: "rgba(18,16,12,.1)", color: MUTED }) }}>{live ? "live" : expired ? "expired" : spent ? "spent" : "off"}</span></Td>
                      <Td><button type="button" onClick={() => copy(iv.code)} style={S.waBtn}>{copied === iv.code ? "Copied ✓" : "Copy link"}</button></Td>
                      <Td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {iv.active && (
                            <button type="button" onClick={() => onDeactivate(iv.code)}
                              style={{ ...S.waBtn, background: "rgba(200,166,92,.15)", color: "#8a6a22", border: "1px solid rgba(200,166,92,.3)" }}>
                              Deactivate
                            </button>
                          )}
                          <button type="button" onClick={() => onDelete(iv.code)}
                            style={{ ...S.waBtn, background: "rgba(162,59,59,.1)", color: "#a23b3b", border: "1px solid rgba(162,59,59,.2)" }}>
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------
function ListingsPanel({ listings, loading, onStatus }: { listings: Listing[]; loading: boolean; onStatus: (id: string, s: string) => void }) {
  if (loading && listings.length === 0) return <Empty>Loading partners…</Empty>;
  if (listings.length === 0) return <Empty>No professional sign-ups yet.</Empty>;
  return (
    <div>
      <div style={{ margin: "16px 16px 0", padding: "10px 14px", background: "rgba(200,166,92,.1)", borderRadius: 10, border: "1px solid rgba(200,166,92,.3)", fontSize: 13, color: "#6b5210" }}>
        <strong>Ferguson Law Directory Partners</strong> — professionals who signed up via the /directory partner application form on fergusonlawja.com. These are your own referral network (solicitors, surveyors, realtors, valuers, etc.).
      </div>
    <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
      {listings.map((l) => {
        const status = l.status ?? "pending";
        return (
          <div key={l.id} style={S.listCard}>
            <div style={S.listTop}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={S.listType}>{l.kind === "realtor" ? "real estate agent" : l.kind}</span>
                <StatusBadge status={status} />
                <span style={S.muted}>{fmtDate(l.created_at)}</span>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button type="button" onClick={() => onStatus(l.id, "approved")} disabled={status === "approved"}
                  style={{ ...S.approveBtn, ...(status === "approved" ? S.btnOff : null) }}>Approve</button>
                <button type="button" onClick={() => onStatus(l.id, "suspended")} disabled={status === "suspended"}
                  style={{ ...S.rejectBtn, ...(status === "suspended" ? S.btnOff : null) }}>Suspend</button>
              </div>
            </div>
            <div style={S.listTitle}>{l.business_name}</div>
            <div style={S.muted}>{l.contact_name || "—"}{l.parishes?.length ? ` · ${l.parishes.join(", ")}` : ""}</div>
            {l.bio && <div style={{ fontSize: 13, color: INK, marginTop: 4, whiteSpace: "pre-wrap" }}>{l.bio}</div>}
            <div style={{ ...S.muted, marginTop: 6 }}>{l.email || "—"}{l.phone ? ` · ${l.phone}` : ""}{l.website ? ` · ${l.website}` : ""}</div>
            {status === "approved" && l.slug && (
              <div style={{ marginTop: 6 }}>
                <a href={`/directory/${l.slug}`} target="_blank" rel="noopener" style={{ color: "#8a6a22", fontSize: 13 }}>View public page →</a>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account panel
// ---------------------------------------------------------------------------
function AccountPanel({ token, email, onClose, onEmailChange }: {
  token: string; email: string; onClose: () => void; onEmailChange: (email: string) => void;
}) {
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [newEmail, setNewEmail] = useState(email);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePw() {
    setMsg(null);
    if (pw.length < 8) return setMsg({ kind: "err", text: "New password must be at least 8 characters." });
    if (pw !== pw2) return setMsg({ kind: "err", text: "The new passwords don't match." });
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("fl_admin_set_password", { p_token: token, p_current: cur, p_new: pw });
    setBusy(false);
    if (error) { setMsg({ kind: "err", text: "Could not change your password." }); return; }
    setCur(""); setPw(""); setPw2(""); setMsg({ kind: "ok", text: "Password updated." });
  }

  async function changeEmail() {
    setMsg(null);
    const ne = newEmail.trim().toLowerCase();
    if (ne === email) return setMsg({ kind: "err", text: "That's already your email." });
    if (ne.length < 5 || !ne.includes("@")) return setMsg({ kind: "err", text: "Enter a valid email." });
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("fl_admin_set_email", { p_token: token, p_new_email: ne });
    setBusy(false);
    if (error) { setMsg({ kind: "err", text: "Could not change your email." }); return; }
    onEmailChange(ne); setMsg({ kind: "ok", text: "Email updated." });
  }

  const fld: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: ".9rem", marginBottom: 10, boxSizing: "border-box" };
  const btn: React.CSSProperties = { padding: "10px 18px", borderRadius: 999, border: "none", background: "#c9a86a", color: "#10211c", fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 };
  const h: React.CSSProperties = { fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.05rem", margin: "0 0 12px", color: "#10211c" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.45)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: "100%", maxWidth: 460, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ ...h, margin: 0 }}>Your account</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ color: "#6a6a6a", fontSize: ".82rem", margin: "0 0 18px" }}>Administrator · {email}</p>
        {msg && <p style={{ fontSize: ".82rem", margin: "0 0 14px", color: msg.kind === "ok" ? "#2e7d4f" : "#a23b3b" }}>{msg.text}</p>}
        <h3 style={h}>Change password</h3>
        <input type="password" placeholder="Current password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} style={fld} />
        <input type="password" placeholder="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} style={fld} />
        <input type="password" placeholder="Confirm new password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={fld} />
        <button type="button" onClick={changePw} disabled={busy || !cur || !pw} style={btn}>Update password</button>
        <div style={{ height: 1, background: "#ece6da", margin: "22px 0" }} />
        <h3 style={h}>Account email</h3>
        <input type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={fld} />
        <button type="button" onClick={changeEmail} disabled={busy} style={btn}>Update email</button>
      </div>
    </div>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const STATUS_TONE: Record<string, React.CSSProperties> = {
  new: { background: "rgba(200,166,92,.22)", color: "#8a6a22" },
  contacted: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  closed: { background: "rgba(18,16,12,.1)", color: MUTED },
  pending: { background: "rgba(200,166,92,.22)", color: "#8a6a22" },
  approved: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  rejected: { background: "rgba(190,60,60,.14)", color: "#a23b3b" },
  confirmed: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  cancelled: { background: "rgba(190,60,60,.14)", color: "#a23b3b" },
  completed: { background: "rgba(16,42,30,.12)", color: GREEN },
  no_show: { background: "rgba(190,60,60,.14)", color: "#a23b3b" },
  waiting_agent: { background: "rgba(200,166,92,.25)", color: "#8a6a22" },
  agent: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  bot: { background: "rgba(18,16,12,.08)", color: MUTED },
  closed_chat: { background: "rgba(18,16,12,.1)", color: MUTED },
};

// ---------------------------------------------------------------------------
// Funnel Chart
// ---------------------------------------------------------------------------
function FunnelChart({ leads, appts, matters }: { leads: Lead[]; appts: Appointment[]; matters: Matter[] }) {
  const total = leads.length || 1;
  const booked = appts.filter(a => a.status !== "cancelled").length;
  const retained = matters.filter(m => ["active","closed"].includes(m.stage)).length;
  const stages = [
    { label: "Leads", value: leads.length, pct: 100 },
    { label: "Booked", value: booked, pct: Math.round((booked / total) * 100) },
    { label: "Retained", value: retained, pct: Math.round((retained / total) * 100) },
  ];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 72 }}>
      {stages.map((s, i) => (
        <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: GREEN }}>{s.value}</div>
          <div style={{ width: "100%", height: `${Math.max(s.pct * 0.56, 8)}px`, background: i === 0 ? GREEN : i === 1 ? GOLD : "rgba(16,42,30,.35)", borderRadius: 4, transition: "height .4s" }} />
          <div style={{ fontSize: ".65rem", color: MUTED, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
        </div>
      ))}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: ".7rem", fontWeight: 700, color: GOLD }}>{leads.length > 0 ? Math.round((retained / leads.length) * 100) : 0}%</div>
        <div style={{ width: "100%", height: "8px", background: "rgba(200,166,92,.18)", borderRadius: 4 }} />
        <div style={{ fontSize: ".65rem", color: MUTED, textTransform: "uppercase", letterSpacing: ".06em" }}>Close rate</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban View for Matters
// ---------------------------------------------------------------------------
const KANBAN_COLS = [
  { key: "intake",   label: "Intake" },
  { key: "active",   label: "Active" },
  { key: "on_hold",  label: "On Hold" },
  { key: "closed",   label: "Closed" },
];

function KanbanView({ matters, onStage, onExpand }: {
  matters: Matter[];
  onStage: (id: string, s: string) => void;
  onExpand?: (id: string) => void;
}) {
  if (matters.length === 0) return <Empty>No matters yet.</Empty>;
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "20px", alignItems: "flex-start" }}>
      {KANBAN_COLS.map(col => {
        const cards = matters.filter(m => m.stage === col.key);
        return (
          <div key={col.key} style={{ minWidth: 180, flex: "0 0 180px" }}>
            <div style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: MUTED, marginBottom: 10, padding: "0 2px" }}>
              {col.label} <span style={{ color: GOLD }}>·{cards.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cards.map(m => (
                <div key={m.id} style={{ background: "#fff", border: "1px solid rgba(18,16,12,.09)", borderRadius: 8, padding: "12px 14px", boxShadow: "0 2px 8px -4px rgba(0,0,0,.15)" }}>
                  <div style={{ fontWeight: 600, fontSize: ".82rem", color: GREEN, marginBottom: 3 }}>{m.client_name || "—"}</div>
                  <div style={{ fontSize: ".7rem", color: MUTED, marginBottom: 8 }}>{m.matter_type || "—"} · {m.ref}</div>
                  <select value={m.stage} onChange={e => onStage(m.id, e.target.value)}
                    style={{ width: "100%", fontSize: ".7rem", padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(18,16,12,.15)", background: "#faf8f2", color: INK, cursor: "pointer" }}>
                    {MATTER_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                  </select>
                  {onExpand && (
                    <button type="button" onClick={() => onExpand(m.id)}
                      style={{ marginTop: 8, width: "100%", fontSize: ".68rem", fontWeight: 600, color: GOLD, background: "rgba(200,166,92,.1)", border: "1px solid rgba(200,166,92,.3)", borderRadius: 6, padding: "4px 0", cursor: "pointer" }}>
                      ≡ Milestones
                    </button>
                  )}
                </div>
              ))}
              {cards.length === 0 && <div style={{ padding: "14px 10px", fontSize: ".75rem", color: "rgba(18,16,12,.25)", textAlign: "center", border: "1px dashed rgba(18,16,12,.1)", borderRadius: 8 }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  authWrap: { minHeight: "100dvh", display: "grid", placeItems: "center", alignContent: "center", background: GREEN, fontFamily: "var(--sans, system-ui, sans-serif)", padding: 20 },
  authCard: { background: "#0a0a0a", borderRadius: 18, padding: "34px 30px", width: "100%", maxWidth: 380, textAlign: "center", boxShadow: "0 30px 70px -24px rgba(0,0,0,.8), 0 0 0 1px rgba(200,166,92,.15)" },
  brandMark: { fontFamily: "var(--serif, Georgia, serif)", fontWeight: 600, fontSize: "1.4rem", color: GOLD, letterSpacing: ".01em" },
  authTitle: { fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.05rem", color: "#f5f0e8", margin: "8px 0 4px" },
  authSub: { color: "rgba(245,240,232,.55)", fontSize: ".85rem", marginBottom: 18 },
  authInput: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(200,166,92,.25)", background: "rgba(255,255,255,.06)", color: "#f5f0e8", fontSize: ".95rem", marginBottom: 12, outline: "none", boxSizing: "border-box" },
  authErr: { color: "#e07070", fontSize: ".8rem", margin: "0 0 12px" },
  authBtn: { width: "100%", padding: "12px 14px", borderRadius: 999, border: "none", background: GOLD, color: "#0a0a0a", fontWeight: 700, cursor: "pointer" },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },
  authLinks: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" },
  authLink: { color: MUTED, fontSize: ".8rem", textDecoration: "none" },
  authLinkBtn: { background: "none", border: "none", color: MUTED, fontSize: ".8rem", cursor: "pointer", padding: 0, textDecoration: "underline" },
  shell: { minHeight: "100dvh", background: "#f4f1ea", fontFamily: "var(--sans, system-ui, sans-serif)", color: INK },
  topbar: { background: GREEN, color: CREAM, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderBottom: `1px solid rgba(200,166,92,.18)` },
  brandMarkSm: { fontFamily: "var(--serif, Georgia, serif)", fontWeight: 600, fontSize: "1.1rem", color: CREAM, letterSpacing: ".01em" },
  topSub: { fontSize: ".7rem", color: "rgba(200,166,92,.7)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 },
  topActions: { display: "flex", gap: 8 },
  ghostBtn: { padding: "7px 16px", borderRadius: 6, border: "1px solid rgba(246,242,234,.18)", background: "transparent", color: "rgba(246,242,234,.75)", fontWeight: 500, fontSize: ".78rem", cursor: "pointer", letterSpacing: ".01em" },
  body: { maxWidth: 1320, margin: "0 auto", padding: "28px 24px 72px" },
  statStrip: { display: "flex", gap: 0, background: GREEN, borderRadius: 10, overflow: "hidden", marginBottom: 28, boxShadow: "0 4px 24px -12px rgba(16,42,30,.35)" },
  statCard: { flex: 1, padding: "18px 22px", borderRight: "1px solid rgba(255,255,255,.07)", cursor: "pointer" },
  statValue: { fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.75rem", fontWeight: 700, color: CREAM, lineHeight: 1 },
  statLabel: { fontSize: ".68rem", color: "rgba(200,166,92,.8)", marginTop: 5, textTransform: "uppercase", letterSpacing: ".07em" },
  errorBar: { background: "rgba(190,60,60,.07)", border: "1px solid rgba(190,60,60,.2)", color: "#a23b3b", borderRadius: 8, padding: "10px 14px", fontSize: ".84rem", marginBottom: 16 },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid rgba(18,16,12,.1)", marginBottom: 0, overflowX: "auto" },
  tab: { display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 16px", border: "none", borderBottom: "2px solid transparent", background: "transparent", color: MUTED, fontWeight: 500, fontSize: ".8rem", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap", letterSpacing: ".01em" },
  tabActive: { color: GREEN, borderBottomColor: GOLD, fontWeight: 600 },
  tabCount: { fontSize: ".65rem", fontWeight: 700, padding: "1px 7px", borderRadius: 999, background: "rgba(18,16,12,.07)", color: MUTED },
  tabCountActive: { background: GOLD, color: GREEN },
  panel: { background: "#fff", border: "1px solid rgba(18,16,12,.07)", borderRadius: "0 0 12px 12px", overflow: "hidden" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".86rem", minWidth: 760 },
  th: { textAlign: "left", padding: "12px 16px", background: GREEN, color: CREAM, fontWeight: 600, fontSize: ".74rem", textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid rgba(18,16,12,.07)" },
  td: { padding: "12px 16px", verticalAlign: "top", color: INK },
  strong: { fontWeight: 600, color: GREEN },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  muted: { color: MUTED },
  contactCol: { display: "flex", flexDirection: "column", gap: 2 },
  msgCell: { maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", color: INK },
  select: { padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)", background: "#fff", fontSize: ".82rem", color: INK, cursor: "pointer" },
  statusBadge: { display: "inline-block", fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", padding: "3px 9px", borderRadius: 999 },
  badgeNeutral: { background: "rgba(18,16,12,.08)", color: MUTED },
  sourceBadge: { display: "inline-block", fontSize: ".72rem", fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: "rgba(200,166,92,.18)", color: "#8a6a22" },
  waBtn: { display: "inline-block", padding: "6px 14px", borderRadius: 999, background: GREEN, color: CREAM, fontSize: ".78rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", border: "none", cursor: "pointer" },
  emptyState: { padding: "48px 20px", textAlign: "center", color: MUTED, fontSize: ".9rem" },
  inviteForm: { background: "#faf8f2", border: "1px solid rgba(18,16,12,.1)", borderRadius: 14, padding: "18px 20px", marginBottom: 22 },
  inviteFormGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: MUTED },
  fieldInput: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", background: "#fff", fontSize: ".9rem", color: INK, outline: "none", boxSizing: "border-box" },
  listCard: { border: "1px solid rgba(18,16,12,.1)", borderRadius: 12, padding: 16, background: "#fff" },
  listTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 },
  listType: { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#8a6a22", background: "rgba(200,166,92,.16)", borderRadius: 999, padding: "3px 9px" },
  listTitle: { fontWeight: 700, fontSize: 15, color: GREEN, marginTop: 2 },
  listThumb: { width: 60, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(18,16,12,.1)" },
  approveBtn: { border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: GREEN, color: CREAM },
  rejectBtn: { border: "1px solid rgba(190,60,60,.4)", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff", color: "#a23b3b" },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)", background: "#faf8f2", fontSize: ".84rem", color: INK, outline: "none", width: "100%", boxSizing: "border-box" } as React.CSSProperties,
  btn: { padding: "7px 16px", borderRadius: 999, border: "none", fontWeight: 600, cursor: "pointer", fontSize: ".84rem" } as React.CSSProperties,
};

// ---------------------------------------------------------------------------
// H.O.M.E. — Professional Approvals
// ---------------------------------------------------------------------------
function HomeProsPanel({ pros, loading, onApprove }: {
  pros: HomePro[]; loading: boolean; onApprove: (userId: string) => void;
}) {
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

  const rejectPro = useCallback(async (userId: string) => {
    await fetch(`${HR_URL}/rest/v1/home_professional_profiles?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": HR_KEY, "Authorization": `Bearer ${HR_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal",
      },
      body: JSON.stringify({ rejected: true }),
    });
    setRejectedIds(prev => new Set(prev).add(userId));
  }, []);

  const visiblePros = pros.filter(p => !rejectedIds.has(p.user_id));
  if (loading && pros.length === 0) return <Empty>Loading H.O.M.E. professionals…</Empty>;
  if (visiblePros.length === 0) return <Empty>No professionals awaiting verification.</Empty>;
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(200,166,92,.1)", borderRadius: 10, border: "1px solid rgba(200,166,92,.3)", fontSize: 13, color: "#6b5210" }}>
        <strong>H.O.M.E. Platform Professionals</strong> — professionals who applied via the H.O.M.E. by Ferguson Law platform (home.fergusonlawja.com). These serve homebuyers on the H.O.M.E. marketplace and are separate from your Directory partners.
      </div>
    <div style={{ display: "grid", gap: 14 }}>
      {visiblePros.map((p) => (
        <div key={p.user_id} style={S.listCard}>
          <div style={S.listTop}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={S.listType}>{p.profession}</span>
              <span style={{ ...S.statusBadge, background: "rgba(200,166,92,.22)", color: "#8a6a22" }}>pending</span>
              <span style={S.muted}>{fmtDate(p.created_at)}</span>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button type="button" onClick={() => onApprove(p.user_id)} style={S.approveBtn}>Approve</button>
              <button type="button" onClick={() => void rejectPro(p.user_id)} style={S.rejectBtn}>Reject</button>
            </div>
          </div>
          <div style={S.listTitle}>{p.business_name || "—"}</div>
          {p.headline && <div style={{ fontSize: 13, color: INK, marginTop: 2 }}>{p.headline}</div>}
          <div style={{ ...S.muted, marginTop: 4 }}>
            {p.license_number ? `Licence: ${p.license_number}` : "No licence number"}
            {p.parishes?.length ? ` · ${p.parishes.join(", ")}` : ""}
            {p.phone ? ` · ${p.phone}` : ""}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// H.O.M.E. — Property Listings (CRUD)
// ---------------------------------------------------------------------------
const HR_PARISHES = ["Kingston","St. Andrew","St. Catherine","St. Thomas","Portland","St. Mary","St. Ann","Trelawny","St. James","Hanover","Westmoreland","St. Elizabeth","Manchester","Clarendon"];

function HomeListingsPanel({ listings, loading }: { listings: HomeProperty[]; loading: boolean }) {
  const [rows, setRows] = useState<HomeProperty[]>(listings);
  const [editing, setEditing] = useState<HomeProperty | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editForm, setEditForm] = useState<Partial<HomeProperty>>({});

  useEffect(() => { setRows(listings); }, [listings]);

  function openEdit(l: HomeProperty) { setEditing(l); setEditForm({ title: l.title, parish: l.parish, price_jmd: l.price_jmd, status: l.status }); }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    const res = await fetch(`${HR_URL}/rest/v1/home_properties?id=eq.${editing.id}`, {
      method: "PATCH",
      headers: { "apikey": HR_KEY, "Authorization": `Bearer ${HR_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => r.id === editing.id ? { ...r, ...editForm } as HomeProperty : r));
      setEditing(null);
    }
    setBusy(false);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setBusy(true);
    await fetch(`${HR_URL}/rest/v1/home_properties?id=eq.${deleteId}`, {
      method: "DELETE",
      headers: { "apikey": HR_KEY, "Authorization": `Bearer ${HR_KEY}`, "Prefer": "return=minimal" },
    });
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    setBusy(false);
  }

  const fld: React.CSSProperties = { ...S.fieldInput, width: "100%", marginBottom: 10, boxSizing: "border-box" };

  if (loading && rows.length === 0) return <Empty>Loading H.O.M.E. listings…</Empty>;
  if (rows.length === 0) return <Empty>No active property listings found.</Empty>;

  return (
    <div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr><Th>Title</Th><Th>Parish</Th><Th>Price (JMD)</Th><Th>Status</Th><Th>Date listed</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} style={S.tr}>
                <Td><span style={S.strong}>{l.title}</span></Td>
                <Td>{l.parish}</Td>
                <Td>J${l.price_jmd.toLocaleString()}</Td>
                <Td><StatusBadge status={l.status} /></Td>
                <Td>{fmtDate(l.created_at)}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => openEdit(l)} style={{ ...S.waBtn, background: GOLD, color: "#10211c" }}>Edit</button>
                    <button type="button" onClick={() => setDeleteId(l.id)} style={S.rejectBtn}>Delete</button>
                    <a href={`${HR_BASE}/properties/${l.id}`} target="_blank" rel="noopener noreferrer" style={S.waBtn}>View →</a>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.5)", display: "grid", placeItems: "center", padding: 16, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--serif,Georgia,serif)", fontWeight: 700, fontSize: "1.1rem", color: GREEN }}>Edit listing</span>
              <button type="button" onClick={() => setEditing(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
            </div>
            <label style={S.fieldLabel}>Title</label>
            <input style={fld} value={editForm.title ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            <label style={S.fieldLabel}>Parish</label>
            <select style={fld} value={editForm.parish ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, parish: e.target.value }))}>
              {HR_PARISHES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <label style={S.fieldLabel}>Price (JMD)</label>
            <input style={fld} type="number" min={0} value={editForm.price_jmd ?? 0} onChange={(e) => setEditForm((f) => ({ ...f, price_jmd: Number(e.target.value) }))} />
            <label style={S.fieldLabel}>Status</label>
            <select style={fld} value={editForm.status ?? "active"} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as HomeProperty["status"] }))}>
              {["active","sold","draft"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => void saveEdit()} disabled={busy}
                style={{ ...S.authBtn, width: "auto", padding: "10px 22px", ...(busy ? S.btnOff : null) }}>
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditing(null)}
                style={{ padding: "10px 18px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".88rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div onClick={() => setDeleteId(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.5)", display: "grid", placeItems: "center", padding: 16, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 380 }}>
            <div style={{ fontFamily: "var(--serif,Georgia,serif)", fontWeight: 700, fontSize: "1.1rem", color: GREEN, marginBottom: 10 }}>Delete listing?</div>
            <p style={{ fontSize: ".9rem", color: INK, marginBottom: 18 }}>
              "{rows.find((r) => r.id === deleteId)?.title}" will be permanently deleted from the H.O.M.E. platform.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => void confirmDelete()} disabled={busy}
                style={{ ...S.rejectBtn, padding: "10px 20px", borderRadius: 999, ...(busy ? S.btnOff : null) }}>
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button type="button" onClick={() => setDeleteId(null)}
                style={{ padding: "10px 18px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".88rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CMS Tab — workflow-based case management
// ─────────────────────────────────────────────────────────────────────────────

interface CmsMatter {
  id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  matter_type: string;
  workflow_type: string | null;
  current_phase: number;
  status: string;
  kyc_status: string;
  title: string | null;
  notes: string | null;
  created_at: string;
}

interface CmsMilestone {
  id: string;
  matter_id: string;
  phase_order: number;
  phase_name: string;
  name: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface CmsMessage {
  id: string;
  matter_id: string;
  sender_id: string | null;
  sender_type: string;
  sender_label: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface CmsFile {
  id: string;
  matter_id: string;
  uploader_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

interface CmsKyc {
  id: string;
  client_id: string;
  full_legal_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  id_type: string | null;
  id_number: string | null;
  id_doc_url: string | null;
  trn: string | null;
  source_of_funds: string | null;
  is_pep: boolean;
  pep_details: string | null;
  aml_declared: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  status: string;
}

interface CmsPayment {
  id: string;
  matter_id: string;
  kind: string;
  amount_jmd: number;
  method: string | null;
  reference: string | null;
  status: string;
  confirmed_at: string | null;
  receipt_issued: boolean;
  receipt_number: string | null;
  created_at: string;
}

interface CmsClientHit {
  id: string;
  email: string;
  full_name: string;
}

const MS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  pending:        { bg: "#f5f5f5", color: "#888",    border: "#ddd" },
  in_progress:    { bg: "#fdf3d9", color: "#8a6a22", border: "#e8d090" },
  done:           { bg: "#dff0df", color: "#1a4d28", border: "#a5d4a5" },
  not_applicable: { bg: "#f0f0f0", color: "#999",    border: "#ccc" },
};

const MS_LABELS: Record<string, string> = {
  pending: "pending", in_progress: "in progress", done: "done", not_applicable: "N/A",
};

const MATTER_STATUS_OPTS = ["intake","in_progress","awaiting_client","awaiting_third_party","completed","on_hold","cancelled"];
const MILESTONE_STATUS_OPTS = ["pending","in_progress","done","not_applicable"];

function CmsTab({ token, onUnreadChange }: { token: string; onUnreadChange?: (n: number) => void }) {
  const supabase = createClient();
  const [matters, setMatters] = useState<CmsMatter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<CmsMilestone[]>([]);
  const [messages, setMessages] = useState<CmsMessage[]>([]);
  const [files, setFiles] = useState<CmsFile[]>([]);
  const [kyc, setKyc] = useState<CmsKyc | null>(null);
  const [payments, setPayments] = useState<CmsPayment[]>([]);
  const [tab, setTab] = useState<"timeline"|"messages"|"files"|"kyc"|"payments">("timeline");
  const [unreadByMatter, setUnreadByMatter] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openMatter, setOpenMatter] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientHits, setClientHits] = useState<CmsClientHit[]>([]);
  const [newClientId, setNewClientId] = useState("");
  const [newClientLabel, setNewClientLabel] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newWorkflow, setNewWorkflow] = useState("property_purchase");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [kycNotes, setKycNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [payKind, setPayKind] = useState("deposit");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("wipay");
  const [payRef, setPayRef] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const chk = () => setIsMobile(window.innerWidth < 640); chk(); window.addEventListener("resize", chk); return () => window.removeEventListener("resize", chk); }, []);

  useEffect(() => {
    const q = clientQuery.trim();
    if (q.length < 2) { setClientHits([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("fl_admin_cms_client_search", { p_token: token, p_query: q });
      setClientHits((data as CmsClientHit[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("fl_admin_cms_matters", { p_token: token });
      setMatters((data as CmsMatter[]) ?? []);
      setLoading(false);
      // Load per-matter unread counts without marking anything as read
      const { data: ucData } = await supabase.rpc("fl_admin_cms_unread_counts", { p_token: token });
      if (ucData) {
        const map: Record<string, number> = {};
        for (const row of ucData as { matter_id: string; unread_messages: number; unread_files: number }[]) {
          map[row.matter_id] = (row.unread_messages ?? 0) + (row.unread_files ?? 0);
        }
        setUnreadByMatter(map);
        const total = Object.values(map).reduce((a, b) => a + b, 0);
        onUnreadChange?.(total);
      }
    })();
  }, []);

  async function loadDetail(id: string) {
    setSelected(id); setDetailLoading(true); setTab("timeline");
    const matter = matters.find(m => m.id === id);
    const [mRes, msgRes, fRes, kRes, pRes] = await Promise.all([
      supabase.rpc("fl_admin_cms_milestones", { p_token: token, p_matter_id: id }),
      supabase.rpc("fl_admin_cms_messages", { p_token: token, p_matter_id: id }),
      supabase.rpc("fl_admin_cms_files", { p_token: token, p_matter_id: id }),
      matter ? supabase.rpc("fl_admin_cms_kyc_get", { p_token: token, p_client_id: matter.client_id }) : Promise.resolve({ data: null }),
      supabase.rpc("fl_admin_cms_payments", { p_token: token, p_matter_id: id }),
    ]);
    const loadedMessages = (msgRes.data as CmsMessage[]) ?? [];
    setMilestones((mRes.data as CmsMilestone[]) ?? []);
    setMessages(loadedMessages);
    setFiles((fRes.data as CmsFile[]) ?? []);
    const kycRows = kRes.data as CmsKyc[] | null;
    setKyc(kycRows?.[0] ?? null);
    setKycNotes(kycRows?.[0]?.reviewer_notes ?? "");
    setPayments((pRes.data as CmsPayment[]) ?? []);
    setDetailLoading(false);
    // Mark both files and messages read when admin opens a matter
    void supabase.rpc("fl_admin_cms_mark_files_read", { p_token: token, p_matter_id: id });
    void fetch("/api/admin/cms/mark-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, matterId: id }) });
    setUnreadByMatter(prev => {
      const next = { ...prev, [id]: 0 };
      const newTotal = Object.values(next).reduce((a, b) => a + b, 0);
      onUnreadChange?.(newTotal);
      return next;
    });
  }

  async function notifyClient(matterId: string, kind: "milestone" | "message", milestoneName?: string) {
    try {
      await fetch("/api/admin/cms/notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, matterId, kind, milestoneName }),
      });
    } catch { /* best-effort — notification failure never blocks the action */ }
  }

  async function updateMilestone(id: string, status: string) {
    const m = milestones.find(x => x.id === id);
    await supabase.rpc("fl_admin_cms_update_milestone", { p_token: token, p_id: id, p_status: status });
    setMilestones(prev => prev.map(x => x.id === id
      ? { ...x, status, completed_at: status === "done" ? new Date().toISOString() : x.completed_at }
      : x
    ));
    if (status === "done" && m && selected) void notifyClient(selected, "milestone", m.name);
  }

  const [addingStepPhase, setAddingStepPhase] = useState<{ order: number; name: string } | null>(null);
  const [newStepName, setNewStepName] = useState("");
  const [savingStep, setSavingStep] = useState(false);
  const [stepScope, setStepScope] = useState<"matter" | "global">("matter");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepName, setEditingStepName] = useState("");
  const [savingEditStep, setSavingEditStep] = useState(false);
  const [addingNoteForId, setAddingNoteForId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function addStep() {
    if (!selected || !addingStepPhase || !newStepName.trim() || savingStep) return;
    setSavingStep(true);
    const stepName = newStepName.trim();

    if (stepScope === "global") {
      const activeMatterData = matters.find(m => m.id === selected);
      const wfType = activeMatterData?.workflow_type;
      if (wfType) {
        const { data: tplData } = await supabase.rpc("fl_admin_workflow_templates_get", { p_token: token });
        const tpl = (tplData as WfTemplate[] ?? []).find(t => t.type === wfType);
        if (tpl) {
          await supabase.rpc("fl_admin_workflow_add_step", {
            p_token: token, p_template_id: tpl.id,
            p_phase_order: addingStepPhase.order, p_step_name: stepName,
          });
        }
      }
    }

    const { data, error } = await supabase.rpc("fl_admin_cms_add_step", {
      p_token: token,
      p_matter_id: selected,
      p_phase_order: addingStepPhase.order,
      p_phase_name: addingStepPhase.name,
      p_name: stepName,
    });
    if (!error && data) {
      const newMs: CmsMilestone = {
        id: data as string, matter_id: selected,
        phase_order: addingStepPhase.order, phase_name: addingStepPhase.name,
        name: stepName, status: "pending",
        due_at: null, completed_at: null, notes: null,
        created_at: new Date().toISOString(),
      };
      setMilestones(prev => [...prev, newMs]);
    }
    setNewStepName(""); setAddingStepPhase(null); setStepScope("matter");
    setSavingStep(false);
  }

  async function deleteStep(id: string) {
    if (!confirm("Remove this step from this client's matter?")) return;
    await supabase.rpc("fl_admin_cms_delete_step", { p_token: token, p_id: id });
    setMilestones(prev => prev.filter(m => m.id !== id));
  }

  async function saveEditStep(id: string) {
    const name = editingStepName.trim();
    if (!name || savingEditStep) return;
    setSavingEditStep(true);
    await supabase.rpc("fl_admin_cms_update_step", { p_token: token, p_id: id, p_name: name });
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, name } : m));
    setEditingStepId(null);
    setEditingStepName("");
    setSavingEditStep(false);
  }

  async function saveNote(id: string) {
    if (savingNote) return;
    setSavingNote(true);
    const notes = noteText.trim() || null;
    await supabase.from("fl_matter_milestones").update({ notes }).eq("id", id);
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, notes } : m));
    setAddingNoteForId(null);
    setNoteText("");
    setSavingNote(false);
  }

  async function updateMatterStatus(id: string, status: string) {
    await supabase.rpc("fl_admin_cms_update_matter_status", { p_token: token, p_matter_id: id, p_status: status });
    setMatters(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  }

  async function deleteClientData(m: CmsMatter) {
    if (!confirm(
      `Permanently delete ALL data for ${m.client_name} (${m.client_email})?\n\n` +
      `This removes their login, client profile, every matter, KYC/ID documents, uploaded files, messages, payments, appointments, and email history — everywhere, not just this matter. This cannot be undone.`
    )) return;
    const typed = prompt(`Type the client's email to confirm — ${m.client_email}`);
    if (typed?.trim().toLowerCase() !== m.client_email.toLowerCase()) {
      if (typed !== null) alert("Email didn't match — nothing was deleted.");
      return;
    }
    setPurging(true);
    try {
      const res = await fetch("/api/admin/cms/purge-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, clientId: m.client_id, clientEmail: m.client_email, clientName: m.client_name, confirm: true }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Deletion failed."); return; }
      setMatters(prev => prev.filter(x => x.client_email !== m.client_email));
      setSelected(null);
      alert("Client data deleted and confirmation email sent.");
    } finally {
      setPurging(false);
    }
  }

  async function reviewKyc(status: "approved" | "flagged") {
    if (!kyc) return;
    await supabase.rpc("fl_admin_cms_kyc_review", { p_token: token, p_kyc_id: kyc.id, p_status: status, p_notes: kycNotes || null });
    setKyc(prev => prev ? { ...prev, status, reviewer_notes: kycNotes || null, reviewed_at: new Date().toISOString() } : prev);
    if (selected) setMatters(prev => prev.map(m => m.id === selected ? { ...m, kyc_status: status } : m));
  }

  async function addPayment() {
    if (!selected || !payAmount.trim() || addingPayment) return;
    setAddingPayment(true);
    const { data } = await supabase.rpc("fl_admin_cms_add_payment", {
      p_token: token, p_matter_id: selected, p_kind: payKind,
      p_amount_jmd: Number(payAmount), p_method: payMethod || null, p_reference: payRef.trim() || null,
    });
    if (data) {
      setPayments(prev => [{
        id: data as string, matter_id: selected, kind: payKind, amount_jmd: Number(payAmount),
        method: payMethod, reference: payRef.trim() || null, status: "pending", confirmed_at: null,
        receipt_issued: false, receipt_number: null, created_at: new Date().toISOString(),
      }, ...prev]);
      setPayAmount(""); setPayRef("");
    }
    setAddingPayment(false);
  }

  async function confirmPayment(id: string) {
    const res = await fetch("/api/admin/cms/payment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "confirm", paymentId: id }),
    });
    if (res.ok) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "confirmed", confirmed_at: new Date().toISOString() } : p));
    }
  }

  async function issueReceipt(id: string) {
    const res = await fetch("/api/admin/cms/payment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action: "issue-receipt", paymentId: id }),
    });
    const json = (await res.json().catch(() => ({}))) as { receiptNumber?: string; error?: string };
    if (res.ok && json.receiptNumber) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, receipt_issued: true, receipt_number: json.receiptNumber! } : p));
    } else if (json.error) {
      alert(json.error);
    }
  }

  async function uploadStaffFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected || uploading) return;
    setUploading(true);
    const form = new FormData();
    form.append("token", token); form.append("matterId", selected); form.append("file", file);
    const res = await fetch("/api/admin/cms/upload", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; url?: string; name?: string; size?: number; mimeType?: string; error?: string };
    if (res.ok && json.ok) {
      setFiles(prev => [{
        id: json.id!, matter_id: selected, uploader_type: "staff",
        file_name: json.name!, file_url: json.url!, file_size: json.size ?? null,
        mime_type: json.mimeType ?? null, created_at: new Date().toISOString(),
      }, ...prev]);
    } else if (json.error) {
      alert(json.error);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    const clean = msgText.replace(/[﻿​‌‍⁠]/g, "").trim();
    if (!clean || !selected) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("fl_admin_cms_send_message", {
        p_token: token, p_matter_id: selected, p_body: clean, p_label: "Ferguson Law",
      });
      if (error) throw error;
      if (data) {
        setMessages(prev => [...prev, {
          id: data as string, matter_id: selected, sender_id: null,
          sender_type: "staff", sender_label: "Ferguson Law",
          body: clean, read_at: null, created_at: new Date().toISOString(),
        }]);
        setMsgText("");
        void notifyClient(selected, "message");
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (err) {
      alert("Failed to send message: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  }

  async function createMatter() {
    if (!newClientId.trim() && !newClientName.trim() && !newClientLabel.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const emailParam = (newClientEmail.trim().toLowerCase() || null);
      const { data, error } = await supabase.rpc("fl_admin_cms_open_matter", {
        p_token: token,
        p_client_id: newClientId || null,
        p_workflow_type: newWorkflow,
        p_title: newTitle || null,
        p_client_name: newClientId ? null : (newClientName.trim() || null),
        p_client_email: emailParam,
      });
      if (error) throw error;
      if (!data) throw new Error("No matter ID returned — check the RPC returned a value.");

      // Send portal invite if client has no auth account but email was provided
      if (!newClientId && emailParam) {
        void fetch("/api/admin/cms/invite-client", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": token },
          body: JSON.stringify({ email: emailParam, clientName: newClientName.trim() || undefined, matterTitle: newTitle.trim() || undefined }),
        }).catch(() => null);
      }

      const { data: refreshed } = await supabase.rpc("fl_admin_cms_matters", { p_token: token });
      setMatters((refreshed as CmsMatter[]) ?? []);
      setOpenMatter(false);
      setNewClientId(""); setNewClientLabel(""); setClientQuery(""); setClientHits([]); setNewTitle(""); setNewClientName(""); setNewClientEmail("");
      void loadDetail(data as string);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      // Client has no portal account — send invite and guide admin
      if (msg.toLowerCase().includes("client not found") && (newClientEmail.trim() || newClientId.trim())) {
        const email = newClientEmail.trim() || "";
        if (email) {
          void fetch("/api/admin/cms/invite-client", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-token": token },
            body: JSON.stringify({ email, clientName: newClientName.trim() || undefined, matterTitle: newTitle.trim() || undefined }),
          }).catch(() => null);
          setCreateError(`No portal account found for ${email}. A sign-up invite has been sent. Once they log in, open their matter here.`);
        } else {
          setCreateError("Client not found. Enter their email address so we can send them a portal invite.");
        }
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreating(false);
    }
  }

  const activeMatter = matters.find(m => m.id === selected);

  const phases = milestones.reduce<Record<number, { name: string; items: CmsMilestone[] }>>((acc, m) => {
    if (!acc[m.phase_order]) acc[m.phase_order] = { name: m.phase_name, items: [] };
    acc[m.phase_order].items.push(m);
    return acc;
  }, {});
  const phaseList = Object.entries(phases).sort(([a], [b]) => Number(a) - Number(b));

  if (loading) return <div style={{ padding: 20, color: MUTED }}>Loading CMS matters…</div>;

  return (
    <div style={{ display: "flex", height: isMobile ? "auto" : "calc(100vh - 260px)", minHeight: isMobile ? 0 : 500, overflow: "hidden", flexDirection: isMobile ? "column" : "row" }}>
      {/* Left sidebar */}
      <div style={{ width: isMobile ? "100%" : 280, flexShrink: 0, borderRight: isMobile ? "none" : `1px solid rgba(18,16,12,.1)`, borderBottom: isMobile ? `1px solid rgba(18,16,12,.1)` : "none", overflowY: "auto", padding: "16px 12px", display: isMobile && !!selected ? "none" : "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: GREEN }}>CMS Matters</span>
          <button onClick={() => setOpenMatter(true)} style={{
            background: GREEN, color: CREAM, border: "none", borderRadius: 8,
            padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>+ New</button>
        </div>
        {matters.length === 0 && (
          <p style={{ fontSize: 13, color: MUTED }}>No workflow matters yet. Click + New to open one.</p>
        )}
        {matters.map(m => (
          <button key={m.id} onClick={() => loadDetail(m.id)} style={{
            display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
            padding: "10px 12px", borderRadius: 10, marginBottom: 6,
            background: selected === m.id ? `rgba(16,42,30,.08)` : "transparent",
            borderLeft: selected === m.id ? `3px solid ${GOLD}` : "3px solid transparent",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a6a22", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>
              {m.workflow_type?.replace(/_/g, " ") || m.matter_type}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{m.title || m.client_name}</span>
              {(unreadByMatter[m.id] ?? 0) > 0 && (
                <span style={{ background: "#c0392b", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>
                  {unreadByMatter[m.id]}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{m.client_email}</div>
            <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, background: "rgba(18,16,12,.07)", borderRadius: 999, padding: "2px 7px" }}>{m.status}</span>
              {m.kyc_status !== "approved" && (
                <span
                  title={
                    m.kyc_status === "pending"
                      ? "Client has not yet submitted their KYC/AML form. This is separate from matter milestones."
                      : m.kyc_status === "submitted"
                      ? "Client submitted KYC — go to the KYC tab to review and approve."
                      : m.kyc_status === "flagged"
                      ? "KYC flagged for review. Check the KYC tab."
                      : ""
                  }
                  style={{ fontSize: 11, fontWeight: 600, color: "#8a6a22", background: "rgba(200,166,92,.2)", borderRadius: 999, padding: "2px 7px", cursor: "help" }}
                >
                  KYC {m.kyc_status}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, overflowY: "auto", display: isMobile && !selected ? "none" : "flex", flexDirection: "column" }}>
        {isMobile && !!selected && (
          <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(18,16,12,.1)", color: GREEN, fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}>
            \u2190 Matters
          </button>
        )}
        {!selected ? (
          <div style={{ padding: 40, textAlign: "center", color: MUTED, fontSize: 14 }}>
            Select a matter to view details
          </div>
        ) : detailLoading ? (
          <div style={{ padding: 40, color: MUTED }}>Loading…</div>
        ) : activeMatter ? (
          <>
            {/* Matter header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid rgba(18,16,12,.1)`, background: "#faf8f2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8a6a22", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 3 }}>
                    {activeMatter.workflow_type?.replace(/_/g, " ") || activeMatter.matter_type}
                  </div>
                  <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: 18, fontWeight: 700, color: GREEN }}>
                    {activeMatter.title || activeMatter.client_name}
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>
                    {activeMatter.client_name} · {activeMatter.client_email}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <select
                    value={activeMatter.status}
                    onChange={e => updateMatterStatus(activeMatter.id, e.target.value)}
                    style={{ fontSize: 12, padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)", background: "#fff" }}
                  >
                    {MATTER_STATUS_OPTS.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                  </select>
                  <button
                    onClick={() => deleteClientData(activeMatter)}
                    disabled={purging}
                    title="Permanently delete this client's login, profile, matters, files, and messages — everywhere"
                    style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "1px solid #d33", background: "#fff", color: "#d33", cursor: purging ? "default" : "pointer", fontWeight: 600 }}
                  >
                    {purging ? "Deleting…" : "Delete client & all data"}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid rgba(18,16,12,.1)`, background: "#fafaf8" }}>
              {(["timeline","kyc","messages","files","payments"] as const).map(t => {
                const unreadClientMsgs = messages.filter(m => m.sender_type === "client" && !m.read_at).length;
                return (
                <button key={t} onClick={async () => {
                  setTab(t);
                  if (t === "messages" && selected && unreadClientMsgs > 0) {
                    // Mark all client messages read for this matter
                    await fetch("/api/admin/cms/mark-read", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token, matterId: selected }),
                    });
                    setMessages(prev => prev.map(m =>
                      m.sender_type === "client" && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
                    ));
                    if (selected) setUnreadByMatter(prev => ({ ...prev, [selected]: 0 }));
                    try {
                      const r = await fetch(`/api/admin/cms/unread-count?token=${encodeURIComponent(token)}`);
                      const j = await r.json() as { count: number };
                      onUnreadChange?.(j.count ?? 0);
                    } catch { /* swallow */ }
                  }
                }} style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 600, border: "none",
                  background: "none", cursor: "pointer", color: tab === t ? INK : MUTED,
                  borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
                }}>
                  {t === "messages" ? `Messages${unreadClientMsgs > 0 ? ` (${unreadClientMsgs})` : ""}`
                    : t === "files" ? `Files (${files.length})`
                    : t === "kyc" ? `KYC/AML${kyc && kyc.status !== "approved" ? " •" : ""}`
                    : t === "payments" ? `Payments (${payments.length})`
                    : "Timeline"}
                </button>
              );})}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {/* TIMELINE */}
              {tab === "timeline" && (
                <div>
                  {phaseList.length === 0 ? (
                    <p style={{ color: MUTED, fontSize: 14 }}>No milestones. This matter may not have a workflow template.</p>
                  ) : phaseList.map(([orderStr, phase]) => {
                    const countable = phase.items.filter(i => i.status !== "not_applicable");
                    const done = countable.filter(i => i.status === "done").length;
                    const pct = countable.length ? Math.round((done / countable.length) * 100) : 100;
                    const isAddingHere = addingStepPhase?.order === Number(orderStr);
                    return (
                      <div key={orderStr} style={{ marginBottom: 26 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>{phase.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: MUTED }}>{done}/{countable.length}</span>
                            <button type="button"
                              onClick={() => { setAddingStepPhase(isAddingHere ? null : { order: Number(orderStr), name: phase.name }); setNewStepName(""); }}
                              style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, border: `1px solid ${GOLD}`, background: isAddingHere ? GOLD : "transparent", color: isAddingHere ? "#fff" : "#8a6a22", cursor: "pointer", fontWeight: 600 }}>
                              {isAddingHere ? "Cancel" : "+ Step"}
                            </button>
                          </div>
                        </div>
                        <div style={{ height: 4, background: "#eee", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a4d28" : GOLD, borderRadius: 4, transition: "width .3s" }} />
                        </div>
                        {phase.items.map(m => {
                          const mc = MS_COLORS[m.status] ?? MS_COLORS.pending;
                          const isEditingName = editingStepId === m.id;
                          const isAddingNote = addingNoteForId === m.id;
                          return (
                            <div key={m.id} style={{
                              borderRadius: 8, marginBottom: 4,
                              background: m.status === "in_progress" ? "#fffbf0" : m.status === "not_applicable" ? "#f8f8f8" : "#fff",
                              border: `1px solid ${m.status === "in_progress" ? "#f0e4b0" : "rgba(18,16,12,.08)"}`,
                              opacity: m.status === "not_applicable" ? 0.6 : 1,
                            }}>
                              {/* Step name + controls row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
                                {isEditingName ? (
                                  <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                                    <input
                                      autoFocus
                                      value={editingStepName}
                                      onChange={e => setEditingStepName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") void saveEditStep(m.id);
                                        if (e.key === "Escape") { setEditingStepId(null); setEditingStepName(""); }
                                      }}
                                      style={{ flex: 1, fontSize: 13, padding: "3px 8px", borderRadius: 7, border: `1px solid ${GOLD}`, outline: "none" }}
                                    />
                                    <button type="button" onClick={() => void saveEditStep(m.id)} disabled={savingEditStep || !editingStepName.trim()}
                                      style={{ padding: "3px 10px", borderRadius: 7, border: "none", background: GREEN, color: CREAM, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: savingEditStep ? 0.5 : 1 }}>
                                      {savingEditStep ? "…" : "Save"}
                                    </button>
                                    <button type="button" onClick={() => { setEditingStepId(null); setEditingStepName(""); }}
                                      style={{ padding: "3px 8px", borderRadius: 7, border: `1px solid rgba(18,16,12,.15)`, background: "#fff", color: MUTED, fontSize: 12, cursor: "pointer" }}>
                                      Cancel
                                    </button>
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 13, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                                    <span style={{
                                      display: "flex", alignItems: "center", gap: 6,
                                      color: m.status === "done" ? "#2e7d32" : m.status === "not_applicable" ? MUTED : INK,
                                      fontWeight: m.status === "done" ? 600 : 400,
                                      textDecoration: m.status === "not_applicable" ? "line-through" : "none",
                                    }}>
                                      {m.status === "done" && <span style={{ fontSize: 12, color: "#2e7d32" }}>✅</span>}
                                      {m.status === "not_applicable" && <span style={{ fontSize: 12 }}>—</span>}
                                      <span style={{ cursor: "default" }}>
                                        {m.name}
                                      </span>
                                    </span>
                                    {m.notes && !isAddingNote && (
                                      <span style={{ fontSize: 11, color: MUTED, fontStyle: "italic", paddingLeft: 2 }}>{m.notes}</span>
                                    )}
                                    {!isAddingNote && (
                                      <button type="button"
                                        onClick={() => { setAddingNoteForId(m.id); setNoteText(m.notes || ""); setEditingStepId(null); }}
                                        style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: MUTED, cursor: "pointer", textAlign: "left", width: "fit-content" }}>
                                        {m.notes ? "Edit result note" : "+ Add result note"}
                                      </button>
                                    )}
                                  </span>
                                )}
                                <select
                                  value={m.status}
                                  onChange={e => updateMilestone(m.id, e.target.value)}
                                  style={{
                                    fontSize: 11.5, padding: "3px 7px", borderRadius: 7, fontWeight: 700,
                                    border: `1px solid ${mc.border}`, background: mc.bg, color: mc.color, cursor: "pointer",
                                  }}
                                >
                                  {MILESTONE_STATUS_OPTS.map(o => <option key={o} value={o}>{MS_LABELS[o] ?? o}</option>)}
                                </select>
                                <button type="button" onClick={() => deleteStep(m.id)}
                                  title="Remove step" style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 14, padding: "0 2px" }}>✕</button>
                              </div>
                              {/* Result note editor — step name stays read-only here */}
                              {isAddingNote && (
                                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                                  <textarea
                                    autoFocus
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder="Result / outcome notes (optional)..."
                                    rows={2}
                                    style={{ width: "100%", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: `1px solid ${GOLD}`, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                                  />
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button type="button" onClick={() => void saveNote(m.id)} disabled={savingNote}
                                      style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: GREEN, color: CREAM, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: savingNote ? 0.5 : 1 }}>
                                      {savingNote ? "…" : "Save"}
                                    </button>
                                    <button type="button" onClick={() => { setAddingNoteForId(null); setNoteText(""); }}
                                      style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid rgba(18,16,12,.15)`, background: "#fff", color: MUTED, fontSize: 12, cursor: "pointer" }}>
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {isAddingHere && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                              {(["matter", "global"] as const).map(scope => (
                                <button key={scope} type="button" onClick={() => setStepScope(scope)}
                                  style={{ flex: 1, padding: "5px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                    border: `1px solid ${stepScope === scope ? GREEN : "rgba(18,16,12,.18)"}`,
                                    background: stepScope === scope ? GREEN : "#fff",
                                    color: stepScope === scope ? CREAM : MUTED }}>
                                  {scope === "matter" ? "This matter only" : `All ${activeMatter.workflow_type?.replace(/_/g, " ") || "matters"}`}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <input
                                autoFocus
                                value={newStepName}
                                onChange={e => setNewStepName(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") void addStep(); if (e.key === "Escape") { setAddingStepPhase(null); setNewStepName(""); setStepScope("matter"); } }}
                                placeholder="Step name…"
                                style={{ flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${GOLD}`, outline: "none" }}
                              />
                              <button type="button" onClick={() => void addStep()} disabled={savingStep || !newStepName.trim()}
                                style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: GREEN, color: CREAM, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: savingStep || !newStepName.trim() ? 0.5 : 1 }}>
                                {savingStep ? "…" : "Add"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MESSAGES */}
              {tab === "messages" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {messages.length === 0 ? (
                      <p style={{ color: MUTED, fontSize: 13 }}>No messages yet.</p>
                    ) : messages.map(msg => (
                      <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender_type === "staff" ? "flex-end" : "flex-start" }}>
                        <div style={{
                          maxWidth: "76%", padding: "9px 13px", borderRadius: 11,
                          background: msg.sender_type === "staff" ? GREEN : "#f3f2ee",
                          color: msg.sender_type === "staff" ? CREAM : INK,
                          fontSize: 13.5,
                        }}>
                          {msg.sender_type === "client" && (
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, opacity: .65 }}>
                              {activeMatter.client_name}
                            </div>
                          )}
                          <div>{msg.body}</div>
                          <div style={{ fontSize: 10.5, marginTop: 4, opacity: .55, textAlign: "right" }}>
                            {fmtDate(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={msgEndRef} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", position: "sticky", bottom: 0, background: "#fff", paddingTop: 8 }}>
                    <textarea
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                      rows={2}
                      placeholder="Reply to client… (Enter to send)"
                      style={{ flex: 1, resize: "none", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none" }}
                    />
                    <button onClick={() => void sendMessage()} disabled={sending || !msgText.trim()}
                      style={{ background: GREEN, color: CREAM, border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {sending ? "…" : "Send"}
                    </button>
                  </div>
                </div>
              )}

              {/* FILES */}
              {tab === "files" && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <input ref={fileInputRef} type="file" onChange={e => void uploadStaffFile(e)} disabled={uploading}
                      style={{ display: "none" }} id="cms-staff-file" />
                    <label htmlFor="cms-staff-file" style={{
                      display: "inline-flex", alignItems: "center", gap: 6, cursor: uploading ? "default" : "pointer",
                      background: uploading ? "#eee" : GREEN, color: uploading ? MUTED : CREAM,
                      borderRadius: 999, padding: "8px 16px", fontSize: 12.5, fontWeight: 700,
                    }}>
                      {uploading ? "Uploading…" : "↑ Upload file to client"}
                    </label>
                  </div>
                  {files.length === 0 ? (
                    <p style={{ color: MUTED, fontSize: 13 }}>No files uploaded yet.</p>
                  ) : files.map(f => (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.1)", background: "#fafaf8", textDecoration: "none", marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>{f.mime_type?.includes("pdf") ? "📄" : f.mime_type?.includes("image") ? "🖼️" : "📎"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file_name}</div>
                        <div style={{ fontSize: 11.5, color: MUTED }}>
                          {f.uploader_type === "client" ? activeMatter.client_name : "Ferguson Law"} · {fmtDate(f.created_at)}
                          {f.file_size ? ` · ${(f.file_size / 1024).toFixed(1)} KB` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "#8a6a22", fontWeight: 600 }}>↓</span>
                    </a>
                  ))}
                </div>
              )}

              {/* KYC / AML */}
              {tab === "kyc" && (
                <div style={{ maxWidth: 560 }}>
                  {!kyc ? (
                    <div>
                      <p style={{ color: MUTED, fontSize: 13.5, marginBottom: 14 }}>
                        No KYC/AML submission on file yet. The client has not completed the identity form.
                        If you have verified this client through other means, you can approve KYC manually.
                      </p>
                      {activeMatter && activeMatter.kyc_status !== "approved" && (
                        <button
                          onClick={async () => {
                            if (!confirm("Mark KYC as approved for this client? Only do this if you have verified their identity through other means.")) return;
                            const { error } = await supabase.rpc("fl_admin_cms_kyc_admin_override", {
                              p_token: token, p_matter_id: activeMatter.id, p_status: "approved",
                            });
                            if (error) { alert("Error: " + error.message); return; }
                            setMatters(prev => prev.map(m => m.id === activeMatter.id ? { ...m, kyc_status: "approved" } : m));
                            alert("KYC marked as approved.");
                          }}
                          style={{ background: "#2f7a52", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                        >
                          Admin-approve KYC
                        </button>
                      )}
                      {activeMatter && activeMatter.kyc_status === "approved" && (
                        <span style={{ fontSize: 13, color: "#2f7a52", fontWeight: 700 }}>KYC approved (admin override)</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                          background: kyc.status === "approved" ? "rgba(47,122,82,.16)" : kyc.status === "flagged" ? "rgba(122,32,32,.12)" : "rgba(200,166,92,.2)",
                          color: kyc.status === "approved" ? "#2f7a52" : kyc.status === "flagged" ? "#7a2020" : "#8a6a22",
                        }}>{{ pending: "Pending review", approved: "Approved", flagged: "Flagged" }[kyc.status] ?? kyc.status}</span>
                        {kyc.submitted_at && <span style={{ fontSize: 12, color: MUTED }}>Submitted {fmtDate(kyc.submitted_at)}</span>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        {[["Full legal name", kyc.full_legal_name], ["Date of birth", kyc.date_of_birth], ["Nationality", kyc.nationality],
                          ["TRN", kyc.trn], ["ID type", kyc.id_type], ["ID number", kyc.id_number], ["Address", kyc.address],
                          ["Source of funds", kyc.source_of_funds], ["Politically exposed?", kyc.is_pep ? "Yes" : "No"],
                          ["AML declaration", kyc.aml_declared ? "✓ Declared" : "Not declared"]].map(([label, val]) => (
                          <div key={label as string}>
                            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: MUTED, marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 13.5, color: INK }}>{val || "—"}</div>
                          </div>
                        ))}
                      </div>
                      {kyc.is_pep && kyc.pep_details && (
                        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fbeaea", borderRadius: 10, fontSize: 13 }}>
                          <strong>PEP details:</strong> {kyc.pep_details}
                        </div>
                      )}
                      {kyc.id_doc_url && (
                        <a href={kyc.id_doc_url} target="_blank" rel="noopener" style={{ display: "inline-block", marginBottom: 18, fontSize: 13, color: "#8a6a22", fontWeight: 600 }}>
                          📄 View identity document
                        </a>
                      )}
                      <div style={S.field}>
                        <label style={S.fieldLabel}>Reviewer notes</label>
                        <textarea value={kycNotes} onChange={e => setKycNotes(e.target.value)} rows={3}
                          style={{ ...S.fieldInput, resize: "vertical", fontFamily: "inherit" }} placeholder="Notes for the compliance file…" />
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                        <button onClick={() => void reviewKyc("approved")}
                          style={{ background: "#2f7a52", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          Approve
                        </button>
                        <button onClick={() => void reviewKyc("flagged")}
                          style={{ background: "#fff", color: "#7a2020", border: "1px solid #eecaca", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          Flag for review
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PAYMENTS */}
              {tab === "payments" && (
                <div style={{ maxWidth: 620 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18, padding: 14, background: "#faf8f2", borderRadius: 12 }}>
                    <select value={payKind} onChange={e => setPayKind(e.target.value)} style={{ fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)" }}>
                      {["deposit","balance","fee","disbursement","other"].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <input value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount (JMD)" type="number"
                      style={{ fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)" }} />
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)" }}>
                      {["wipay","bank_transfer","cash","cheque","other"].map(k => <option key={k} value={k}>{k.replace("_"," ")}</option>)}
                    </select>
                    <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Reference (optional)"
                      style={{ fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(18,16,12,.2)" }} />
                    <button onClick={() => void addPayment()} disabled={addingPayment || !payAmount.trim()}
                      style={{ gridColumn: "1/-1", background: GREEN, color: CREAM, border: "none", borderRadius: 8, padding: "9px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                      {addingPayment ? "Recording…" : "Record payment"}
                    </button>
                  </div>
                  {payments.length === 0 ? (
                    <p style={{ color: MUTED, fontSize: 13 }}>No payments recorded yet.</p>
                  ) : payments.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(18,16,12,.1)", background: "#fff", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, textTransform: "capitalize" }}>
                          {p.kind} · JMD ${p.amount_jmd.toLocaleString("en-JM")}
                        </div>
                        <div style={{ fontSize: 11.5, color: MUTED }}>
                          {p.method?.replace("_"," ") || "—"}{p.reference ? ` · ${p.reference}` : ""} · {fmtDate(p.created_at)}
                        </div>
                        {p.receipt_number && (
                          <div style={{ fontSize: 11.5, color: "#2f7a52", fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                            Receipt {p.receipt_number}
                            <a href={`/receipt?id=${p.id}&admin=1&token=${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, color: "#c9a86a", fontWeight: 600, textDecoration: "none" }}>View / Print ↗</a>
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                        background: p.status === "confirmed" ? "rgba(47,122,82,.16)" : "rgba(200,166,92,.2)",
                        color: p.status === "confirmed" ? "#2f7a52" : "#8a6a22",
                      }}>{p.status}</span>
                      {p.status === "pending" && (
                        <button onClick={() => void confirmPayment(p.id)}
                          style={{ background: "#2f7a52", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Confirm
                        </button>
                      )}
                      {p.status === "confirmed" && !p.receipt_issued && (
                        <button onClick={() => void issueReceipt(p.id)}
                          style={{ background: GOLD, color: GREEN, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Issue receipt
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* New matter modal */}
      {openMatter && (
        <div onClick={() => setOpenMatter(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.5)", display: "grid", placeItems: "center", padding: 16, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 420 }}>
            <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: 19, color: GREEN, marginBottom: 18 }}>Open New Matter</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, position: "relative" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: MUTED }}>Client</span>
                {newClientLabel ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: `1px solid ${GOLD}`, background: "#fffbf0" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{newClientLabel}</span>
                    <button type="button" onClick={() => { setNewClientId(""); setNewClientLabel(""); setNewClientEmail(""); setClientQuery(""); setNewClientName(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 16 }}>×</button>
                  </div>
                ) : (
                  <>
                    <input value={clientQuery} onChange={e => setClientQuery(e.target.value)}
                      placeholder="Search by email (or enter name below)…"
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: 13, outline: "none" }} />
                    {clientHits.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid rgba(18,16,12,.15)", borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,.1)", zIndex: 5, maxHeight: 180, overflowY: "auto" }}>
                        {clientHits.map(c => (
                          <button key={c.email} type="button" onClick={() => { setNewClientId(c.id ?? ""); setNewClientEmail(c.email); setNewClientLabel(`${c.full_name} <${c.email}>`); setClientHits([]); setClientQuery(""); setNewClientName(""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13 }}>
                            <div style={{ fontWeight: 600, color: INK }}>{c.full_name}</div>
                            <div style={{ fontSize: 11.5, color: MUTED }}>{c.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: MUTED, textAlign: "center", margin: "4px 0" }}>— or enter manually —</div>
                    <input value={newClientName} onChange={e => setNewClientName(e.target.value)}
                      placeholder="Client name"
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: 13, outline: "none" }} />
                    <input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)}
                      placeholder="Client email (to send portal invite)"
                      type="email"
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: 13, outline: "none" }} />
                    {newClientEmail.trim() && (
                      <div style={{ fontSize: 11.5, color: "#b8872a", display: "flex", alignItems: "center", gap: 5 }}>
                        <span>Invite email will be sent when matter is created</span>
                      </div>
                    )}
                  </>
                )}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: MUTED }}>Workflow</span>
                <select value={newWorkflow} onChange={e => setNewWorkflow(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: 13, outline: "none" }}>
                  <option value="property_purchase">Property Purchase</option>
                  <option value="property_sale">Property Sale</option>
                  <option value="lease_agreement">Lease Agreement</option>
                  <option value="title_search">Title Search</option>
                  <option value="transfer">Title Transfer</option>
                  <option value="power_of_attorney">Power of Attorney (General)</option>
                  <option value="power_of_attorney_limited">Power of Attorney (Limited)</option>
                  <option value="lost_title">Lost Title</option>
                  <option value="first_registration">First Registration</option>
                  <option value="adverse_possession">Adverse Possession</option>
                  <option value="subdivision">Subdivision</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: MUTED }}>Matter title (optional)</span>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 12 Kingsway Ave purchase"
                  style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: 13, outline: "none" }} />
              </label>
            </div>
            {createError && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#fbeaea", border: "1px solid #eecaca", fontSize: 13, color: "#7a2020" }}>
                {createError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => void createMatter()} disabled={creating || (!newClientId.trim() && !newClientName.trim() && !newClientLabel.trim())}
                style={{ flex: 1, background: GREEN, color: CREAM, border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: creating || (!newClientId.trim() && !newClientName.trim()) ? 0.6 : 1 }}>
                {creating ? "Creating…" : "Open Matter"}
              </button>
              <button onClick={() => { setOpenMatter(false); setCreateError(null); }}
                style={{ padding: "12px 20px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 10, background: "#fff", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
interface UpcomingMeeting {
  id: string; ref: string; name: string | null; service: string | null; starts_at: string;
  meeting_url: string | null; meeting_provider: string | null;
}

function MeetingRow({ meeting: m, token, onJoinIframe, onChange }: {
  meeting: UpcomingMeeting; token: string;
  onJoinIframe: (url: string) => void;
  onChange: (updated: UpcomingMeeting | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newTime, setNewTime] = useState("");

  const when = new Intl.DateTimeFormat("en-JM", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Jamaica" }).format(new Date(m.starts_at));

  const BTN: React.CSSProperties = { background: "#fff", color: INK, border: "1px solid rgba(18,16,12,.15)", borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 12.5, cursor: "pointer" };

  async function call(path: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/zoom/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, id: m.id, ...body }),
    });
    return r.json() as Promise<{ ok: boolean; error?: string; url?: string; provider?: string; starts_at?: string }>;
  }

  async function resend() {
    setBusy("resend"); setErr(null);
    const d = await call("resend", {});
    if (!d.ok) setErr(d.error ?? "Could not resend.");
    setBusy(null);
  }

  async function recreate() {
    setBusy("recreate"); setErr(null);
    const d = await call("recreate", {});
    if (d.ok && d.url) onChange({ ...m, meeting_url: d.url, meeting_provider: d.provider ?? "zoom" });
    else setErr(d.error ?? "Could not generate a new link.");
    setBusy(null);
  }

  async function cancel() {
    if (!confirm("Cancel this consultation? The client will be emailed.")) return;
    setBusy("cancel"); setErr(null);
    const d = await call("cancel", {});
    if (d.ok) onChange(null);
    else { setErr(d.error ?? "Could not cancel."); setBusy(null); }
  }

  async function reschedule() {
    if (!newTime) return;
    setBusy("reschedule"); setErr(null);
    // newTime is a wall-clock "YYYY-MM-DDTHH:mm" with no zone — the server
    // interprets it as Jamaica time, so this works regardless of the admin's
    // own browser timezone.
    const d = await call("reschedule", { starts_at_wall: newTime });
    if (d.ok && d.starts_at) { onChange({ ...m, starts_at: d.starts_at }); setRescheduling(false); setNewTime(""); }
    else setErr(d.error ?? "Could not reschedule.");
    setBusy(null);
  }

  return (
    <div style={{ padding: "14px 18px", background: "#f9f7f3", borderRadius: 10, border: "1px solid rgba(0,0,0,.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: INK }}>{m.name ?? "Client"}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>{m.service} · {when}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {m.meeting_url ? (
            m.meeting_provider === "daily" ? (
              <button onClick={() => onJoinIframe(m.meeting_url!)}
                style={{ background: GREEN, color: GOLD, border: "none", borderRadius: 7, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                Join call
              </button>
            ) : (
              <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", background: GOLD, color: CREAM, borderRadius: 7, padding: "8px 18px", fontWeight: 700, fontSize: 13, textDecoration: "none", flexShrink: 0 }}>
                Join call ↗
              </a>
            )
          ) : (
            <span style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>No link yet</span>
          )}
          <button onClick={() => void resend()} disabled={!!busy} style={{ ...BTN, opacity: busy ? 0.6 : 1 }}>
            {busy === "resend" ? "Sending…" : "Resend link"}
          </button>
          <button onClick={() => void recreate()} disabled={!!busy} style={{ ...BTN, opacity: busy ? 0.6 : 1 }}>
            {busy === "recreate" ? "Generating…" : "New link"}
          </button>
          <button onClick={() => setRescheduling(v => !v)} disabled={!!busy} style={{ ...BTN, opacity: busy ? 0.6 : 1 }}>
            Reschedule
          </button>
          <button onClick={() => void cancel()} disabled={!!busy}
            style={{ ...BTN, color: "#a23b3b", borderColor: "rgba(162,59,59,.3)", opacity: busy ? 0.6 : 1 }}>
            {busy === "cancel" ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      </div>
      {rescheduling && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,.06)" }}>
          <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
            style={{ border: "1px solid rgba(18,16,12,.2)", borderRadius: 7, padding: "7px 10px", fontSize: 13 }} />
          <button onClick={() => void reschedule()} disabled={!newTime || !!busy}
            style={{ ...BTN, background: GOLD, color: CREAM, opacity: !newTime || busy ? 0.6 : 1 }}>
            {busy === "reschedule" ? "Moving…" : "Confirm new time"}
          </button>
          <span style={{ fontSize: 11.5, color: MUTED }}>Jamaica time · client is emailed the new time.</span>
        </div>
      )}
      {err && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#a23b3b" }}>{err}</p>}
    </div>
  );
}

function ZoomSetupTab({ token, appts = [] }: { token: string; appts?: Appointment[] }) {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; status?: string; email?: string; scope?: string; missing?: string[]; error?: string }>(null);
  const [creating, setCreating] = useState(false);
  const [instantMeeting, setInstantMeeting] = useState<{ url: string; provider: string } | null>(null);
  const [activeIframe, setActiveIframe] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingMeeting[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/zoom/upcoming", { headers: { "x-admin-token": token } });
        const d = await r.json() as { ok: boolean; meetings?: UpcomingMeeting[] };
        if (d.ok && (d.meetings ?? []).length > 0) {
          setUpcoming(d.meetings!);
        } else {
          const now = new Date();
          setUpcoming(appts.filter(a => a.status === "confirmed" && new Date(a.starts_at) >= now)
            .map(a => ({ id: a.id, ref: a.ref ?? a.id, name: a.name, service: a.service, starts_at: a.starts_at, meeting_url: null, meeting_provider: null })));
        }
      } catch {
        const now = new Date();
        setUpcoming(appts.filter(a => a.status === "confirmed" && new Date(a.starts_at) >= now)
          .map(a => ({ id: a.id, ref: a.ref ?? a.id, name: a.name, service: a.service, starts_at: a.starts_at, meeting_url: null, meeting_provider: null })));
      }
      finally { setLoadingUpcoming(false); }
    })();
  }, [token]);

  async function testConnection() {
    setTesting(true); setStatus(null);
    try {
      const r = await fetch("/api/admin/zoom/test", { headers: { "x-admin-token": token } });
      setStatus(await r.json());
    } catch { setStatus({ ok: false, error: "Network error." }); }
    finally { setTesting(false); }
  }

  async function createMeeting() {
    setCreating(true); setCreateErr(null); setInstantMeeting(null);
    try {
      const r = await fetch("/api/admin/zoom/create-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, topic: "Ferguson Law Consultation", start_time: new Date().toISOString(), duration_minutes: 60 }),
      });
      const d = await r.json() as { ok: boolean; url?: string; provider?: string; error?: string };
      if (d.ok && d.url) {
        setInstantMeeting({ url: d.url, provider: d.provider ?? "zoom" });
        if (d.provider === "daily") setActiveIframe(d.url);
      } else setCreateErr(d.error ?? "Could not create meeting.");
    } catch { setCreateErr("Network error."); }
    finally { setCreating(false); }
  }

  const CODE: React.CSSProperties = { display: "inline-block", background: "#f0ece4", borderRadius: 5, padding: "1px 7px", fontFamily: "monospace", fontSize: 13, color: "#4a3f2f" };
  const SECTION: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "24px 28px", marginBottom: 18, border: "1px solid rgba(18,16,12,.08)" };
  const STEP_NUM: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: GOLD, color: CREAM, fontWeight: 800, fontSize: 13, flexShrink: 0, marginTop: 1 };
  const STEP_ROW: React.CSSProperties = { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 0" }}>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, margin: 0, color: INK }}>Video Consultations</h2>
        <p style={{ marginTop: 6, color: MUTED, fontSize: 14 }}>Clients get a video call link in their confirmation email. Join from here or start an instant call below.</p>
      </div>

      {/* ── LIVE CALL IFRAME ── */}
      {activeIframe && (
        <div style={{ ...SECTION, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,.07)" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: INK }}>Live consultation</span>
            <div style={{ display: "flex", gap: 10 }}>
              <a href={activeIframe} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: GOLD }}>Open in new tab ↗</a>
              <button onClick={() => setActiveIframe(null)} style={{ fontSize: 12, background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: MUTED }}>Close</button>
            </div>
          </div>
          <iframe src={activeIframe} allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: "100%", height: 520, border: "none", display: "block" }} />
        </div>
      )}

      {/* ── INSTANT MEETING ── */}
      <div style={{ ...SECTION, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: INK }}>Start an instant consultation</p>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Generates a video call room instantly — click Join to enter.</p>
        <button
          onClick={() => void createMeeting()}
          disabled={creating}
          style={{ background: GOLD, color: CREAM, border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: creating ? 0.7 : 1, alignSelf: "flex-start" }}
        >
          {creating ? "Creating meeting…" : "Create instant meeting"}
        </button>
        {instantMeeting && (
          <div style={{ background: "#f0f7f0", border: "1px solid #b2dfb5", borderRadius: 10, padding: "16px 20px" }}>
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: "#1e5c22" }}>
              Meeting ready{instantMeeting.provider === "daily" ? " · embedded below" : ""}{instantMeeting.provider === "jitsi" ? " · via Jitsi Meet" : ""}
            </p>
            {(instantMeeting.provider === "zoom" || instantMeeting.provider === "jitsi") && (
              <a href={instantMeeting.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", background: GOLD, color: CREAM, borderRadius: 8, padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Join call ↗
              </a>
            )}
            {instantMeeting.provider === "daily" && !activeIframe && (
              <button onClick={() => setActiveIframe(instantMeeting.url)}
                style={{ background: GREEN, color: GOLD, border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Join call
              </button>
            )}
          </div>
        )}
        {createErr && <p style={{ color: "#c0392b", fontSize: 13, margin: 0 }}>{createErr}</p>}
      </div>

      {/* ── UPCOMING MEETINGS ── */}
      <div style={SECTION}>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: INK }}>Upcoming consultations</p>
        <p style={{ fontSize: 12, color: MUTED, margin: "0 0 16px" }}>Resend the link, generate a fresh one, move the time, or cancel — the client is emailed automatically for each.</p>
        {loadingUpcoming ? (
          <p style={{ fontSize: 13, color: MUTED }}>Loading…</p>
        ) : upcoming.length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED }}>No upcoming confirmed bookings. Video call links appear here automatically when clients book and pay.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map(m => (
              <MeetingRow key={m.id} meeting={m} token={token}
                onJoinIframe={(url) => setActiveIframe(url)}
                onChange={(updated) => setUpcoming(prev => updated === null
                  ? prev.filter(x => x.id !== m.id)
                  : prev.map(x => x.id === m.id ? updated : x).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()))}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── STATUS ── */}
      {status && (
        <div style={{ borderRadius: 10, padding: "14px 18px", marginBottom: 18, fontSize: 14, background: status.ok ? "#edf7ee" : "#fdf0f0", border: `1px solid ${status.ok ? "#b2dfb5" : "#f5c6c6"}`, color: status.ok ? "#1e5c22" : "#7a1515" }}>
          {status.ok
            ? `Connected — video calling active`
            : status.status === "not_configured"
              ? `Not configured yet.`
              : `Error: ${status.error}`}
        </div>
      )}

      <div style={{ ...SECTION, background: "#f9f7f3" }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: INK }}>How it works</p>
        <ul style={{ fontSize: 13.5, lineHeight: 1.9, color: MUTED, paddingLeft: 18, margin: 0 }}>
          <li>When a client books and pays, a video room is auto-created and the join link goes in their confirmation email.</li>
          <li>Upcoming bookings appear above — click "Join call" to enter. Clients use their own link from the confirmation email to join the same call.</li>
          <li>Clients can enter before you — no waiting room.</li>
        </ul>
      </div>

      <button onClick={() => setShowSetup(v => !v)} style={{ background: "none", border: "none", color: MUTED, fontSize: 12.5, cursor: "pointer", padding: "4px 0", textDecoration: "underline" }}>
        {showSetup ? "Hide advanced setup" : "Advanced setup"}
      </button>

      {showSetup && (
        <div style={{ ...SECTION, marginTop: 10 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: INK }}>Setup (one-time, technical)</p>
          {[
            { n: 1, body: <>In your video-calling provider&apos;s developer console, copy the <strong>Account ID</strong>, <strong>Client ID</strong>, and <strong>Client Secret</strong>.</> },
            { n: 2, body: <>Go to your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>Vercel dashboard</a> → <strong>ferguson-law</strong> → <strong>Settings → Environment Variables</strong> → add these three:<br /><br />
              <span style={CODE}>ZOOM_ACCOUNT_ID</span><br />
              <span style={CODE}>ZOOM_CLIENT_ID</span><br />
              <span style={CODE}>ZOOM_CLIENT_SECRET</span><br /><br />
              Save for all environments.</> },
            { n: 3, body: <>Redeploy, then click <strong>Test Connection</strong> below.</> },
          ].map(({ n, body }) => (
            <div key={n} style={STEP_ROW}>
              <span style={STEP_NUM}>{n}</span>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: INK }}>{body}</div>
            </div>
          ))}
          <button onClick={() => void testConnection()} disabled={testing} style={{ marginTop: 8, background: GOLD, color: CREAM, border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: testing ? 0.7 : 1 }}>
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      )}

    </div>
  );
}

interface TesterFeedbackRow {
  id: string; created_at: string; tester_name: string; tester_role: string;
  persona: string; site_tested: string; device_type: string; rating: number;
  what_worked: string; what_didnt: string; suggestions: string; would_use: boolean | null;
}

function TesterFeedbackTab({ token }: { token: string }) {
  const [rows, setRows] = useState<TesterFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("fl_admin_test_feedback", { p_token: token });
      setRows((data as TesterFeedbackRow[]) ?? []);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div style={{ padding: 24, color: "#888" }}>Loading feedback...</div>;
  if (!rows.length) return <div style={{ padding: 24, color: "#888" }}>No feedback submitted yet.</div>;

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ marginBottom: 16, fontSize: 13, color: "#888" }}>{rows.length} submission{rows.length !== 1 ? "s" : ""}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(r => (
          <div key={r.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #ede8de" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#10211c" }}>{r.tester_name}</span>
                <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>{r.tester_role}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: "#f0ede6", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#10211c" }}>{r.persona?.split(" — ")[0]}</span>
                {r.device_type && <span style={{ background: "#f0ede6", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#555" }}>{r.device_type}</span>}
                <span style={{ background: "#c9a86a", color: "#10211c", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{"★".repeat(r.rating)}</span>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: "#888", marginBottom: 8 }}>
              {r.site_tested && <span>{r.site_tested} &nbsp;·&nbsp; </span>}
              {new Date(r.created_at).toLocaleDateString("en-JM", { day: "numeric", month: "short", year: "numeric" })}
              {r.would_use !== null && <span> &nbsp;·&nbsp; Would use: <strong>{r.would_use ? "Yes" : "No"}</strong></span>}
            </div>
            {r.what_worked && <p style={{ fontSize: 13, color: "#333", margin: "6px 0 0" }}><strong>Worked:</strong> {r.what_worked}</p>}
            {r.what_didnt && <p style={{ fontSize: 13, color: "#333", margin: "6px 0 0" }}><strong>Didn&apos;t work:</strong> {r.what_didnt}</p>}
            {r.suggestions && <p style={{ fontSize: 13, color: "#333", margin: "6px 0 0" }}><strong>Suggestions:</strong> {r.suggestions}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

