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
import { waLink } from "@/lib/site";

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
type ApptStatus = "pending" | "confirmed" | "cancelled" | "completed";

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

type Tab = "overview" | "leads" | "bookings" | "clients" | "matters" | "cms" | "calendar" | "chats" | "invites" | "directory" | "availability" | "home_pros" | "home_listings" | "email" | "inquiries" | "referrals";

interface InboundEmail {
  id: string;
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
const APPT_STATUSES: ApptStatus[] = ["pending", "confirmed", "cancelled", "completed"];
const MATTER_STAGES = ["enquiry", "consultation_booked", "consultation_done", "retainer", "active", "closed"];
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

  const [loginMode, setLoginMode] = useState<"account" | "code">("account");
  const [emailInput, setEmailInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
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
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Verify stored token on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let stored: string | null = null;
      try { stored = localStorage.getItem(TOKEN_KEY); } catch { stored = null; }
      if (stored) {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("fl_is_admin", { p_token: stored });
        if (cancelled) return;
        if (!error && data === true) { setToken(stored); }
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
    if (!error && data === true) {
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
        supabase.rpc("fl_admin_matters", { p_token: tok }),
        supabase.rpc("fl_admin_get_availability", { p_token: tok }),
      ]);
    const [emailsRes, inquiriesRes] = await Promise.all([
      supabase.rpc("fl_admin_emails", { p_token: tok }),
      supabase.rpc("fl_admin_home_inquiries", { p_token: tok }),
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
      matters: (mattersRes.data as Matter[] | null) ?? [],
      availability: (availRes.data as Availability[] | null) ?? [],
      emails: (emailsRes.data as InboundEmail[] | null) ?? [],
      inquiries: (inquiriesRes.data as HomeInquiry[] | null) ?? [],
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
      setEmails(res.emails); setInquiries(res.inquiries);
    }
    setLoading(false);
  }, [token, fetchAll]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchAll(token);
      if (cancelled) return;
      if (res.error) { setLoadError(res.error); } else {
        setLeads(res.leads); setAppts(res.appts); setConvos(res.convos);
        setInvites(res.invites); setListings(res.listings);
        setClients(res.clients); setMatters(res.matters); setAvailability(res.availability);
        setEmails(res.emails); setInquiries(res.inquiries);
      }
    })();
    return () => { cancelled = true; };
  }, [token, fetchAll]);

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
    await supabase.rpc("fl_admin_set_matter_stage", { p_token: token, p_id: id, p_stage: stage });
  }, [token]);

  const setMatterPayment = useCallback(async (id: string, payment_status: string) => {
    if (!token) return;
    setMatters((prev) => prev.map((m) => m.id === id ? { ...m, payment_status } : m));
    const supabase = createClient();
    await supabase.rpc("fl_admin_set_matter_payment", { p_token: token, p_id: id, p_status: payment_status });
  }, [token]);

  const upsertClient = useCallback(async (fields: {
    name: string; email: string; phone: string; type: string; country: string; notes: string;
  }): Promise<string | null> => {
    if (!token) return "Not authorised.";
    const supabase = createClient();
    const { error } = await supabase.rpc("fl_admin_upsert_client", {
      p_token: token, p_name: fields.name, p_email: fields.email || null,
      p_phone: fields.phone || null, p_type: fields.type || "individual",
      p_country: fields.country || null, p_notes: fields.notes || null,
    });
    if (error) return error.message || "Could not save client.";
    const list = await supabase.rpc("fl_admin_clients", { p_token: token });
    if (list.data) setClients(list.data as Client[]);
    return null;
  }, [token]);

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
    if (!token || !confirm("Delete this client and all their matters? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_delete_client", { p_token: token, p_id: id });
    setClients((prev) => prev.filter((c) => c.id !== id));
    setMatters((prev) => prev.filter((m) => m.client_id !== id));
  }, [token]);

  const deleteLead = useCallback(async (id: string) => {
    if (!token || !confirm("Delete this lead? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_delete_lead", { p_token: token, p_id: id });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, [token]);

  const cancelBooking = useCallback(async (id: string) => {
    if (!token || !confirm("Cancel this booking?")) return;
    const supabase = createClient();
    await supabase.rpc("fl_admin_cancel_booking", { p_token: token, p_id: id });
    setAppts((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
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
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#b9b099", display: "flex", alignItems: "center" }}
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {authError && <p style={S.authErr}>{authError}</p>}
              <button type="button" onClick={() => void submitLogin()}
                disabled={verifying || !emailInput.trim() || !pwInput}
                style={{ ...S.authBtn, ...(verifying || !emailInput.trim() || !pwInput ? S.btnOff : null) }}>
                {verifying ? "Signing in…" : "Sign in"}
              </button>
              <div style={S.authLinks}>
                <a href="/reset?request=admin" style={S.authLink}>Forgot password?</a>
                <button type="button" onClick={() => { setLoginMode("code"); setAuthError(null); }} style={S.authLinkBtn}>
                  Use an access code
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={S.authSub}>Enter the firm access code to continue.</p>
              <input type="password" value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submitCode()} placeholder="Access code"
                style={S.authInput} aria-label="Access code" autoFocus />
              {authError && <p style={S.authErr}>{authError}</p>}
              <button type="button" onClick={() => void submitCode()} disabled={verifying || !codeInput.trim()}
                style={{ ...S.authBtn, ...(verifying || !codeInput.trim() ? S.btnOff : null) }}>
                {verifying ? "Checking…" : "Enter"}
              </button>
              <div style={S.authLinks}>
                <button type="button" onClick={() => { setLoginMode("account"); setAuthError(null); }} style={S.authLinkBtn}>
                  Sign in with email instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={S.shell}>
      <header style={S.topbar}>
        <div>
          <div style={S.brandMarkSm}>Ferguson Law</div>
          <div style={S.topSub}>Consultation CRM · Back office</div>
        </div>
        <div style={S.topActions}>
          <button type="button" onClick={() => void refresh()} disabled={loading}
            style={{ ...S.ghostBtn, ...(loading ? S.btnOff : null) }}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {accountEmail && (
            <button type="button" onClick={() => setShowAccount(true)} style={S.ghostBtn}>Account</button>
          )}
          <button type="button" onClick={signOut} style={S.ghostBtn}>Sign out</button>
        </div>
      </header>

      {showAccount && accountEmail && token && (
        <AccountPanel token={token} email={accountEmail} onClose={() => setShowAccount(false)} onEmailChange={setAccountEmail} />
      )}

      <div style={S.body}>
        <div style={S.statStrip}>
          <Stat label="New leads" value={newLeads} urgent onClick={() => setTab("leads")} />
          <Stat label="Pending bookings" value={pendingBookings} urgent onClick={() => setTab("bookings")} />
          <Stat label="Open chats" value={openChats} urgent onClick={() => setTab("chats")} />
          <Stat label="Clients" value={clients.length} onClick={() => setTab("clients")} />
          <Stat label="Matters" value={matters.length} onClick={() => setTab("matters")} />
          <Stat label="Pending partners" value={pendingListings} onClick={() => setTab("directory")} />
          <Stat label="H.O.M.E. pending" value={homePros.length} urgent onClick={() => setTab("home_pros")} />
        </div>

        {loadError && <div style={S.errorBar}>{loadError}</div>}

        <div style={{ ...S.tabs, background: "#fff", border: "1px solid rgba(18,16,12,.07)", borderRadius: "12px 12px 0 0" }}>
          {(["overview","leads","bookings","clients","matters","cms","calendar","chats","email","invites","directory","availability","home_pros","home_listings","inquiries","referrals"] as Tab[]).map((t) => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}
              label={
                t === "overview" ? "Overview" :
                t === "cms" ? "CMS" :
                t === "home_pros" ? "H.O.M.E. Pros" :
                t === "home_listings" ? "H.O.M.E. Listings" :
                t === "email" ? "Email" :
                t === "inquiries" ? "H.O.M.E. Inquiries" :
                t === "referrals" ? "Referrals" :
                t.charAt(0).toUpperCase() + t.slice(1)
              }
              count={
                t === "overview" ? 0 :
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
                t === "referrals" ? 0 :
                0
              }
            />
          ))}
        </div>

        <div style={S.panel}>
          {tab === "overview" && (
            <OverviewPanel
              leads={leads} appts={appts} convos={convos} matters={matters}
              homePros={homePros} emails={emails} inquiries={inquiries}
              staleLeads={staleLeads} isJordan={isJordan}
              onTab={setTab}
            />
          )}
          {tab === "leads" && <LeadsTable leads={leads} loading={loading} token={token} onStatus={setLeadStatus} onDelete={deleteLead} />}
          {tab === "bookings" && <BookingsTable appts={appts} loading={loading} token={token ?? ""} onStatus={setApptStatus} onCancel={cancelBooking} />}
          {tab === "clients" && <ClientsTab clients={clients} matters={matters} loading={loading} onUpsert={upsertClient} onDelete={deleteClient} />}
          {tab === "matters" && <MattersTab matters={matters} loading={loading} token={token ?? ""} onStage={setMatterStage} onPayment={setMatterPayment} />}
          {tab === "cms" && token && <CmsTab token={token} />}
          {tab === "calendar" && <CalendarTab appts={appts} />}
          {tab === "chats" && <ChatsTable convos={convos} loading={loading} />}
          {tab === "email" && token && <EmailTab emails={emails} token={token} onMarkRead={(id) => setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e))} />}
          {tab === "invites" && <InvitesPanel invites={invites} loading={loading} onCreate={createInvite} onDeactivate={deactivateInvite} onDelete={deleteInvite} />}
          {tab === "directory" && <ListingsPanel listings={listings} loading={loading} onStatus={setListingStatus} />}
          {tab === "availability" && <AvailabilityTab availability={availability} onSave={saveAvailability} token={token ?? ""} />}
          {tab === "home_pros" && <HomeProsPanel pros={homePros} loading={homeLoading} onApprove={approveHomePro} />}
          {tab === "home_listings" && <HomeListingsPanel listings={homeListings} loading={homeLoading} />}
          {tab === "inquiries" && token && <InquiriesTab inquiries={inquiries} token={token} onStatus={(id, status) => setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i))} />}
          {tab === "referrals" && <ReferralsTab leads={leads} appts={appts} />}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function Stat({ label, value, urgent, onClick }: { label: string; value: number; urgent?: boolean; onClick?: () => void }) {
  return (
    <div
      style={{ ...S.statCard, ...(urgent && value > 0 ? { background: "rgba(200,166,92,.12)" } : null), ...(onClick ? { cursor: "pointer" } : null) }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div style={{ ...S.statValue, ...(urgent && value > 0 ? { color: GOLD } : null) }}>{value}</div>
      <div style={{ ...S.statLabel, ...(onClick ? { textDecoration: "underline dotted", textUnderlineOffset: 3 } : null) }}>{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button type="button" onClick={onClick} style={{ ...S.tab, ...(active ? S.tabActive : null) }}>
      {label}
      <span style={{ ...S.tabCount, ...(active ? S.tabCountActive : null) }}>{count}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "—";
  const tone = STATUS_TONE[s] ?? S.badgeNeutral;
  return <span style={{ ...S.statusBadge, ...tone }}>{s}</span>;
}

function TypeBadge({ type, colors }: { type: string | null; colors?: Record<string, React.CSSProperties> }) {
  if (!type) return <span style={S.muted}>—</span>;
  const tone = colors?.[type] ?? { background: "rgba(18,16,12,.08)", color: MUTED };
  return <span style={{ ...S.statusBadge, ...tone }}>{type}</span>;
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span style={S.muted}>—</span>;
  return <span style={S.sourceBadge}>{source}</span>;
}

function StatusSelect({ value, options, onChange }: { value: string | null; options: string[]; onChange: (v: string) => void }) {
  const v = value ?? options[0];
  return (
    <select value={v} onChange={(e) => onChange(e.target.value)} style={S.select} aria-label="Status">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th style={S.th}>{children}</th>; }
function Td({ children, onClick }: { children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLTableCellElement> }) { return <td style={S.td} onClick={onClick}>{children}</td>; }
function Empty({ children }: { children: React.ReactNode }) { return <div style={S.emptyState}>{children}</div>; }

// ---------------------------------------------------------------------------
// Email compose modal
// ---------------------------------------------------------------------------
const TEMPLATES: Record<string, (name: string, service?: string) => string> = {
  acknowledge: (name) =>
    `Dear ${name.split(" ")[0]},\n\nThank you for reaching out to Ferguson Law. We have received your enquiry and a member of our team will be in touch shortly.\n\nShould you have any immediate questions, please feel free to reply to this email or reach us via WhatsApp at (876) 320-0235.\n\nWarm regards,\nFerguson Law`,
  followup: (name, service) =>
    `Dear ${name.split(" ")[0]},\n\nI hope this message finds you well. I wanted to follow up on your recent enquiry${service ? ` regarding ${service}` : ""} and ensure that we have addressed all of your questions.\n\nPlease do not hesitate to reach out if you need any further assistance. We look forward to working with you.\n\nWarm regards,\nFerguson Law`,
  booking: (name) =>
    `Dear ${name.split(" ")[0]},\n\nThank you for booking a consultation with Ferguson Law. Your appointment has been confirmed and you will receive a calendar invitation shortly.\n\nPlease note that your J$8,000 consultation fee will be credited toward your legal fees upon retaining our services.\n\nIf you have any questions before your appointment, please do not hesitate to contact us.\n\nWarm regards,\nFerguson Law`,
};

function EmailComposeModal({ to, toName, defaultSubject, context, service, token, onClose }: {
  to: string; toName: string; defaultSubject: string; context?: string; service?: string; token: string; onClose: () => void;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function applyTemplate(key: string) {
    setBody(TEMPLATES[key]?.(toName, service) ?? "");
  }

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, to, subject, body: body.trim(), replyTo: "contact@fergusonlawja.com" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        setResult({ ok: true, msg: `Sent to ${to}` });
        setTimeout(onClose, 1600);
      } else {
        setResult({ ok: false, msg: json.error ?? "Send failed." });
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : "Send failed." });
    }
    setSending(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.5)", display: "grid", placeItems: "center", padding: 16, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.1rem", color: GREEN }}>Reply to {toName}</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <div style={{ fontSize: ".78rem", color: MUTED, marginBottom: 14 }}>
          To: <strong style={{ color: INK }}>{toName}</strong> &lt;{to}&gt;&nbsp;&nbsp;·&nbsp;&nbsp;From: contact@fergusonlawja.com
        </div>

        {/* Templates */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: ".72rem", fontWeight: 700, color: MUTED, alignSelf: "center", textTransform: "uppercase", letterSpacing: ".05em" }}>Template:</span>
          {[["acknowledge", "Acknowledgement"], ["followup", "Follow-up"], ["booking", "Booking confirm"]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => applyTemplate(k)}
              style={{ fontSize: ".75rem", padding: "4px 12px", borderRadius: 999, border: `1px solid ${GOLD}`, background: "#fff", color: "#8a6a22", cursor: "pointer", fontWeight: 600 }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={S.field}>
            <label style={S.fieldLabel}>Subject</label>
            <input style={S.fieldInput} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div style={S.field}>
            <label style={S.fieldLabel}>Message</label>
            <textarea
              style={{ ...S.fieldInput, resize: "vertical", minHeight: 180, fontFamily: "inherit" }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Dear ${toName.split(" ")[0]},\n\nThank you for reaching out to Ferguson Law…`}
              autoFocus
            />
          </div>
        </div>

        {/* Original message context */}
        {context && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#f8f6f1", borderRadius: 10, borderLeft: `3px solid ${GOLD}` }}>
            <div style={{ fontSize: ".7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: MUTED, marginBottom: 4 }}>Original message</div>
            <div style={{ fontSize: ".82rem", color: INK, whiteSpace: "pre-wrap", lineClamp: 4, overflow: "hidden", maxHeight: 80 }}>{context}</div>
          </div>
        )}

        {result && (
          <p style={{ fontSize: ".82rem", margin: "12px 0 0", color: result.ok ? "#2e7d4f" : "#a23b3b" }}>{result.msg}</p>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={() => void send()} disabled={sending || !body.trim()}
            style={{ ...S.authBtn, width: "auto", padding: "11px 26px", ...(sending || !body.trim() ? S.btnOff : null) }}>
            {sending ? "Sending…" : "Send email"}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding: "11px 18px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".88rem", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
function LeadsTable({ leads, loading, token, onStatus, onDelete }: { leads: Lead[]; loading: boolean; token: string; onStatus: (id: string, s: string) => void; onDelete: (id: string) => void }) {
  const [composing, setComposing] = useState<Lead | null>(null);
  async function deleteLead(id: string, name: string | null) {
    if (!confirm(`Delete lead "${name || "this lead"}"? This cannot be undone.`)) return;
    await createClient().rpc("fl_admin_delete_lead", { p_token: token, p_id: id });
    onDelete(id);
  }
  if (loading && leads.length === 0) return <Empty>Loading leads…</Empty>;
  if (leads.length === 0) return <Empty>No leads yet.</Empty>;
  return (
    <>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><Th>Date</Th><Th>Name</Th><Th>Contact</Th><Th>Service</Th><Th>Source</Th><Th>Message</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {leads.map((l) => {
              const wa = l.phone ? waLink(`Hello ${l.name ?? ""}, this is Ferguson Law following up on your enquiry.`) : null;
              return (
                <tr key={l.id} style={S.tr}>
                  <Td>{fmtDate(l.created_at)}</Td>
                  <Td><span style={S.strong}>{l.name || "—"}</span></Td>
                  <Td><div style={S.contactCol}>{l.email && <span>{l.email}</span>}{l.phone && <span style={S.muted}>{l.phone}</span>}{!l.email && !l.phone && <span style={S.muted}>—</span>}</div></Td>
                  <Td>{l.service || "—"}</Td>
                  <Td><SourceBadge source={l.source} /></Td>
                  <Td><div style={S.msgCell} title={l.message ?? ""}>{l.message || "—"}</div></Td>
                  <Td><StatusSelect value={l.status} options={LEAD_STATUSES} onChange={(v) => onStatus(l.id, v)} /></Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {l.email && (
                        <button type="button" onClick={() => setComposing(l)}
                          style={{ ...S.waBtn, background: "#c9a86a", color: "#10211c" }}>
                          Email
                        </button>
                      )}
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" style={S.waBtn}>WhatsApp</a>}
                      {l.status === "new" && (
                        <button type="button" onClick={() => onStatus(l.id, "contacted")}
                          style={{ ...S.waBtn, background: "rgba(47,122,82,.12)", color: "#2f7a52", border: "1px solid rgba(47,122,82,.25)" }}>
                          ✓ Contacted
                        </button>
                      )}
                      {!l.email && !wa && l.status !== "new" && <span style={S.muted}>—</span>}
                      <button type="button" onClick={() => onDelete(l.id)}
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
      {composing && composing.email && (
        <EmailComposeModal
          to={composing.email}
          toName={composing.name ?? "Client"}
          defaultSubject={composing.service ? `Re: Your ${composing.service} enquiry — Ferguson Law` : `Re: Your enquiry — Ferguson Law`}
          context={composing.message ?? undefined}
          service={composing.service ?? undefined}
          token={token}
          onClose={() => setComposing(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
function BookingsTable({ appts, loading, token, onStatus, onCancel }: { appts: Appointment[]; loading: boolean; token: string; onStatus: (id: string, s: string) => void; onCancel: (id: string) => void }) {
  const [composing, setComposing] = useState<Appointment | null>(null);
  if (loading && appts.length === 0) return <Empty>Loading bookings…</Empty>;
  if (appts.length === 0) return <Empty>No bookings yet.</Empty>;
  return (
    <>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr><Th>When (Jamaica)</Th><Th>Service</Th><Th>Client</Th><Th>Contact</Th><Th>Ref</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {appts.map((a) => (
              <tr key={a.id} style={S.tr}>
                <Td><span style={S.strong}>{fmtWhen(a.starts_at)}</span></Td>
                <Td>{a.service || "—"}</Td>
                <Td>{a.name || "—"}</Td>
                <Td><div style={S.contactCol}>{a.email && <span>{a.email}</span>}{a.phone && <span style={S.muted}>{a.phone}</span>}{!a.email && !a.phone && <span style={S.muted}>—</span>}</div></Td>
                <Td><span style={S.mono}>{a.ref || "—"}</span></Td>
                <Td><StatusSelect value={a.status} options={APPT_STATUSES} onChange={(v) => onStatus(a.id, v)} /></Td>
                <Td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.email && (
                      <button type="button" onClick={() => setComposing(a)}
                        style={{ ...S.waBtn, background: "#c9a86a", color: "#10211c" }}>
                        Email
                      </button>
                    )}
                    {a.status !== "cancelled" && (
                      <button type="button" onClick={() => onCancel(a.id)}
                        style={{ ...S.waBtn, background: "rgba(162,59,59,.1)", color: "#a23b3b", border: "1px solid rgba(162,59,59,.2)" }}>
                        Cancel
                      </button>
                    )}
                    {!a.email && a.status === "cancelled" && <span style={S.muted}>—</span>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {composing && composing.email && (
        <EmailComposeModal
          to={composing.email}
          toName={composing.name ?? "Client"}
          defaultSubject={`Your ${composing.service ?? "consultation"} booking — Ferguson Law`}
          service={composing.service ?? undefined}
          token={token}
          onClose={() => setComposing(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const CLIENT_TYPE_COLORS: Record<string, React.CSSProperties> = {
  individual: { background: "rgba(200,166,92,.18)", color: "#8a6a22" },
  corporate: { background: "rgba(16,42,30,.12)", color: "#102A1E" },
  diaspora: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
};
const CLIENT_STATUS_COLORS: Record<string, React.CSSProperties> = {
  active: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  inactive: { background: "rgba(18,16,12,.1)", color: MUTED },
  prospect: { background: "rgba(200,166,92,.22)", color: "#8a6a22" },
};

function ClientsTab({ clients, matters, loading, onUpsert, onDelete }: {
  clients: Client[]; matters: Matter[]; loading: boolean;
  onUpsert: (f: { name: string; email: string; phone: string; type: string; country: string; notes: string }) => Promise<string | null>;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); const [type, setType] = useState("individual");
  const [country, setCountry] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null);
    const result = await onUpsert({ name: name.trim(), email: email.trim(), phone: phone.trim(), type, country: country.trim(), notes: notes.trim() });
    if (result) { setErr(result); } else { setName(""); setEmail(""); setPhone(""); setCountry(""); setNotes(""); }
    setBusy(false);
  };

  const clientMatters = (id: string) => matters.filter((m) => m.client_id === id);

  return (
    <div style={{ padding: 20 }}>
      {/* New client form */}
      <div style={S.inviteForm}>
        <div style={{ fontWeight: 700, fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".05em", color: MUTED, marginBottom: 12 }}>New Client</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[["Name *", name, setName, "text"], ["Email", email, setEmail, "email"], ["Phone", phone, setPhone, "tel"], ["Country", country, setCountry, "text"]].map(([label, val, setter, inputType]) => (
            <div key={label as string} style={S.field}>
              <label style={S.fieldLabel}>{label as string}</label>
              <input style={S.fieldInput} type={inputType as string} value={val as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} placeholder={label as string} />
            </div>
          ))}
          <div style={S.field}>
            <label style={S.fieldLabel}>Type</label>
            <select style={S.fieldInput} value={type} onChange={(e) => setType(e.target.value)}>
              {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ ...S.field, gridColumn: "1/-1" }}>
            <label style={S.fieldLabel}>Notes</label>
            <input style={S.fieldInput} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brief note" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button type="button" onClick={() => void submit()} disabled={busy || !name.trim()}
            style={{ ...S.authBtn, width: "auto", padding: "10px 22px", ...(busy || !name.trim() ? S.btnOff : null) }}>
            {busy ? "Saving…" : "Save client"}
          </button>
          {err && <span style={{ color: "#a23b3b", fontSize: ".82rem" }}>{err}</span>}
        </div>
      </div>

      {loading && clients.length === 0 ? <Empty>Loading clients…</Empty> :
        clients.length === 0 ? <Empty>No clients yet. Add one above.</Empty> : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr><Th>Name</Th><Th>Contact</Th><Th>Type</Th><Th>Country</Th><Th>Status</Th><Th>Source</Th><Th>Date</Th><Th>Matters</Th><Th>Actions</Th></tr></thead>
              <tbody>
                {clients.map((c) => {
                  const cms = clientMatters(c.id);
                  return (
                    <>
                      <tr key={c.id} style={S.tr}>
                        <Td><span style={S.strong}>{c.name}</span></Td>
                        <Td><div style={S.contactCol}>{c.email && <span>{c.email}</span>}{c.phone && <span style={S.muted}>{c.phone}</span>}</div></Td>
                        <Td><TypeBadge type={c.client_type} colors={CLIENT_TYPE_COLORS} /></Td>
                        <Td>{c.country_of_residence || <span style={S.muted}>—</span>}</Td>
                        <Td><TypeBadge type={c.status} colors={CLIENT_STATUS_COLORS} /></Td>
                        <Td><SourceBadge source={c.source} /></Td>
                        <Td>{fmtDate(c.created_at)}</Td>
                        <Td>
                          {cms.length > 0 ? (
                            <button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                              style={{ ...S.waBtn, background: "transparent", color: GREEN, border: `1px solid ${GREEN}` }}>
                              {cms.length} matter{cms.length > 1 ? "s" : ""} {expanded === c.id ? "▲" : "▼"}
                            </button>
                          ) : <span style={S.muted}>—</span>}
                        </Td>
                        <Td>
                          <button type="button" onClick={() => onDelete(c.id)}
                            style={{ ...S.waBtn, background: "rgba(162,59,59,.1)", color: "#a23b3b", border: "1px solid rgba(162,59,59,.2)" }}>
                            Delete
                          </button>
                        </Td>
                      </tr>
                      {expanded === c.id && cms.map((m) => (
                        <tr key={m.id} style={{ ...S.tr, background: "#faf8f2" }}>
                          <td colSpan={9} style={{ ...S.td, paddingLeft: 32 }}>
                            <span style={S.mono}>{m.ref}</span>
                            {" · "}<strong>{m.matter_type || "matter"}</strong>
                            {" · stage: "}{m.stage}
                            {" · "}{m.payment_status}
                            {m.description ? ` · ${m.description.slice(0, 80)}` : ""}
                          </td>
                        </tr>
                      ))}
                    </>
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
// Matters
// ---------------------------------------------------------------------------
const MATTER_TYPE_COLORS: Record<string, React.CSSProperties> = {
  conveyancing: { background: "rgba(200,166,92,.18)", color: "#8a6a22" },
  estate: { background: "rgba(16,42,30,.12)", color: "#102A1E" },
  commercial: { background: "rgba(47,122,82,.16)", color: "#2f7a52" },
  notarial: { background: "rgba(200,166,92,.12)", color: "#7a6022" },
  diaspora: { background: "rgba(100,80,200,.12)", color: "#4040a0" },
  other: { background: "rgba(18,16,12,.08)", color: MUTED },
};
const PRIORITY_COLORS: Record<string, React.CSSProperties> = {
  standard: { background: "rgba(18,16,12,.08)", color: MUTED },
  urgent: { background: "rgba(190,60,60,.14)", color: "#a23b3b" },
};

function MattersTab({ matters, loading, token, onStage, onPayment }: {
  matters: Matter[]; loading: boolean; token: string;
  onStage: (id: string, s: string) => void; onPayment: (id: string, s: string) => void;
}) {
  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading && matters.length === 0) return <Empty>Loading matters…</Empty>;
  if (matters.length === 0) return <Empty>No matters yet. They are created automatically when consultations are booked via the chatbot.</Empty>;

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, padding: "14px 20px 0", borderBottom: "1px solid rgba(18,16,12,.07)" }}>
        {(["kanban","table"] as const).map(v => (
          <button key={v} type="button" onClick={() => setView(v)}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(18,16,12,.15)", background: view === v ? GREEN : "transparent", color: view === v ? CREAM : MUTED, fontSize: ".75rem", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
            {v === "kanban" ? "⬛ Kanban" : "≡ Table"}
          </button>
        ))}
      </div>
      {view === "kanban" ? (
        <div>
          <KanbanView matters={matters} onStage={onStage} onExpand={toggleExpand} />
          {expandedId && (
            <MilestonePanel key={expandedId} matterId={expandedId} token={token} onClose={() => setExpandedId(null)}
              matter={matters.find(m => m.id === expandedId) ?? null} />
          )}
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead><tr><Th>​</Th><Th>Ref</Th><Th>Client</Th><Th>Type</Th><Th>Stage</Th><Th>Priority</Th><Th>Payment</Th><Th>Description</Th><Th>Date</Th></tr></thead>
            <tbody>
              {matters.map((m) => (
                <>
                  <tr key={m.id} style={{ ...S.tr, cursor: "pointer" }} onClick={() => toggleExpand(m.id)}>
                    <Td><span style={{ color: GOLD, fontWeight: 700, fontSize: ".8rem" }}>{expandedId === m.id ? "▼" : "▶"}</span></Td>
                    <Td><span style={S.mono}>{m.ref}</span></Td>
                    <Td><span style={S.strong}>{m.client_name || "—"}</span></Td>
                    <Td><TypeBadge type={m.matter_type} colors={MATTER_TYPE_COLORS} /></Td>
                    <Td onClick={e => e.stopPropagation()}><StatusSelect value={m.stage} options={MATTER_STAGES} onChange={(v) => onStage(m.id, v)} /></Td>
                    <Td><TypeBadge type={m.priority} colors={PRIORITY_COLORS} /></Td>
                    <Td onClick={e => e.stopPropagation()}><StatusSelect value={m.payment_status} options={PAYMENT_STATUSES} onChange={(v) => onPayment(m.id, v)} /></Td>
                    <Td><div style={S.msgCell} title={m.description ?? ""}>{m.description || "—"}</div></Td>
                    <Td>{fmtDate(m.created_at)}</Td>
                  </tr>
                  {expandedId === m.id && (
                    <tr key={`${m.id}-milestones`}>
                      <td colSpan={9} style={{ padding: 0, background: "rgba(16,42,30,.03)" }}>
                        <MilestonePanel matterId={m.id} token={token} matter={m} onClose={() => setExpandedId(null)} inline />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Milestone panel — shown inline (table) or as modal overlay (kanban)
// ---------------------------------------------------------------------------
const MILESTONE_STATUSES = ["pending", "in_progress", "completed"] as const;
const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: "⬜ Pending", in_progress: "🔵 In Progress", completed: "✅ Done",
};
const MILESTONE_STATUS_COLORS: Record<string, React.CSSProperties> = {
  pending: { background: "rgba(18,16,12,.08)", color: MUTED },
  in_progress: { background: "rgba(47,122,82,.14)", color: GREEN },
  completed: { background: "rgba(200,166,92,.18)", color: "#8a6a22" },
};

function MilestonePanel({ matterId, token, matter, onClose, inline }: {
  matterId: string; token: string; matter: Matter | null;
  onClose: () => void; inline?: boolean;
}) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", notify_client: false });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Milestone>>({});

  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("fl_admin_matter_milestones", { p_token: token, p_matter_id: matterId });
    setMilestones((data as Milestone[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [matterId]);

  async function addMilestone() {
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.rpc("fl_admin_upsert_milestone", {
      p_token: token,
      p_matter_id: matterId,
      p_title: form.title.trim(),
      p_description: form.description || null,
      p_status: "pending",
      p_due_date: form.due_date || null,
      p_notify_client: form.notify_client,
    });
    setForm({ title: "", description: "", due_date: "", notify_client: false });
    await load();
    setSaving(false);
  }

  async function updateMilestone(id: string, patch: Partial<Milestone>) {
    const existing = milestones.find(m => m.id === id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    await supabase.rpc("fl_admin_upsert_milestone", {
      p_token: token,
      p_id: id,
      p_matter_id: matterId,
      p_title: merged.title,
      p_description: merged.description ?? null,
      p_status: merged.status,
      p_due_date: merged.due_date ?? null,
      p_notify_client: merged.notify_client,
    });
    await load();
  }

  async function deleteMilestone(id: string) {
    if (!confirm("Delete this milestone?")) return;
    await supabase.rpc("fl_admin_delete_milestone", { p_token: token, p_id: id });
    await load();
  }

  const content = (
    <div style={{ padding: inline ? "16px 20px" : "24px" }}>
      {!inline && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, color: GREEN, fontSize: "1.1rem" }}>
              Milestones — {matter?.ref}
            </div>
            {matter?.client_name && <div style={{ color: MUTED, fontSize: ".82rem", marginTop: 2 }}>{matter.client_name}</div>}
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
      )}

      {inline && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: ".78rem", fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Milestones
          </span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: MUTED }}>✕ Close</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: MUTED, fontSize: ".85rem", padding: "8px 0" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {milestones.length === 0 && (
            <div style={{ color: MUTED, fontSize: ".82rem" }}>No milestones yet.</div>
          )}
          {milestones.map(ms => (
            <div key={ms.id} style={{ border: "1px solid rgba(18,16,12,.1)", borderRadius: 8, padding: "10px 12px", background: "#fff" }}>
              {editingId === ms.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={editForm.title ?? ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    style={{ ...S.input, fontWeight: 600 }} placeholder="Title" />
                  <textarea value={editForm.description ?? ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    style={{ ...S.input, resize: "vertical", minHeight: 48 }} placeholder="Description (optional)" rows={2} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={editForm.status ?? "pending"} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Milestone["status"] }))}
                      style={S.select}>
                      {MILESTONE_STATUSES.map(s => <option key={s} value={s}>{MILESTONE_STATUS_LABELS[s]}</option>)}
                    </select>
                    <input type="date" value={editForm.due_date ?? ""} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                      style={S.input} />
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".78rem", color: MUTED, cursor: "pointer" }}>
                      <input type="checkbox" checked={editForm.notify_client ?? false} onChange={e => setEditForm(f => ({ ...f, notify_client: e.target.checked }))} />
                      Notify client on complete
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={async () => { await updateMilestone(ms.id, editForm); setEditingId(null); }}
                      style={{ ...S.btn, background: GREEN, color: CREAM, fontSize: ".78rem" }}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)}
                      style={{ ...S.ghostBtn, fontSize: ".78rem" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: ".88rem", color: INK }}>{ms.title}</span>
                      <span style={{ ...MILESTONE_STATUS_COLORS[ms.status], padding: "1px 8px", borderRadius: 20, fontSize: ".72rem", fontWeight: 600 }}>
                        {MILESTONE_STATUS_LABELS[ms.status]}
                      </span>
                      {ms.due_date && (
                        <span style={{ fontSize: ".72rem", color: MUTED }}>Due {ms.due_date}</span>
                      )}
                      {ms.notify_client && (
                        <span style={{ fontSize: ".7rem", color: GOLD, fontWeight: 600 }}>📧 Notifies client</span>
                      )}
                    </div>
                    {ms.description && <div style={{ fontSize: ".8rem", color: MUTED, marginTop: 3 }}>{ms.description}</div>}
                    {ms.completed_at && <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 2 }}>Completed {fmtDate(ms.completed_at)}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {ms.status !== "completed" && (
                      <button type="button" onClick={() => updateMilestone(ms.id, { status: "completed" })}
                        style={{ ...S.ghostBtn, fontSize: ".72rem", color: GREEN, border: `1px solid rgba(16,42,30,.25)` }} title="Mark done">✓</button>
                    )}
                    <button type="button" onClick={() => { setEditingId(ms.id); setEditForm({ ...ms }); }}
                      style={{ ...S.ghostBtn, fontSize: ".72rem" }} title="Edit">✎</button>
                    <button type="button" onClick={() => deleteMilestone(ms.id)}
                      style={{ ...S.ghostBtn, fontSize: ".72rem", color: "#a23b3b" }} title="Delete">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add milestone form */}
      <div style={{ borderTop: "1px solid rgba(18,16,12,.08)", paddingTop: 14 }}>
        <div style={{ fontSize: ".76rem", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Add milestone</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Milestone title" style={S.input}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void addMilestone(); } }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              style={{ ...S.input, width: "auto" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".78rem", color: MUTED, cursor: "pointer" }}>
              <input type="checkbox" checked={form.notify_client} onChange={e => setForm(f => ({ ...f, notify_client: e.target.checked }))} />
              Notify client on complete
            </label>
            <button type="button" onClick={() => void addMilestone()} disabled={saving || !form.title.trim()}
              style={{ ...S.btn, background: GREEN, color: CREAM, fontSize: ".78rem", marginLeft: "auto", opacity: saving || !form.title.trim() ? 0.5 : 1 }}>
              {saving ? "Adding…" : "+ Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.45)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "80vh", overflowY: "auto" }}>
        {content}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar — current week view
// ---------------------------------------------------------------------------
function CalendarTab({ appts }: { appts: Appointment[] }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);

  // Compute current week start (Monday) in Jamaica time
  const weekStart = (() => {
    const now = new Date();
    const jaStr = formatInTimeZone(now, TZ, "yyyy-MM-dd");
    const ja = new Date(jaStr + "T00:00:00");
    const dow = ja.getDay(); // 0=Sun
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    const mon = new Date(ja);
    mon.setDate(mon.getDate() + diffToMon + weekOffset * 7);
    return mon;
  })();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9-17

  function apptForSlot(day: Date, hour: number): Appointment | undefined {
    const dayStr = formatInTimeZone(day, TZ, "yyyy-MM-dd");
    return appts.find((a) => {
      const aDay = formatInTimeZone(new Date(a.starts_at), TZ, "yyyy-MM-dd");
      const aHour = parseInt(formatInTimeZone(new Date(a.starts_at), TZ, "H"), 10);
      return aDay === dayStr && aHour === hour;
    });
  }

  const weekLabel = `${formatInTimeZone(days[0], TZ, "d MMM")} – ${formatInTimeZone(days[6], TZ, "d MMM yyyy")}`;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <button type="button" onClick={() => setWeekOffset((w) => w - 1)} style={{ ...S.ghostBtn, color: GREEN, border: `1px solid rgba(16,42,30,.3)` }}>← Prev</button>
        <span style={{ fontWeight: 700, color: GREEN, fontFamily: "var(--serif, Georgia, serif)" }}>{weekLabel}</span>
        <button type="button" onClick={() => setWeekOffset((w) => w + 1)} style={{ ...S.ghostBtn, color: GREEN, border: `1px solid rgba(16,42,30,.3)` }}>Next →</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700, fontSize: ".82rem" }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 56 }}>Time</th>
              {days.map((d, i) => (
                <th key={i} style={{ ...S.th, textAlign: "center" }}>
                  {formatInTimeZone(d, TZ, "EEE")}
                  <br />
                  <span style={{ fontWeight: 400, fontSize: ".7rem" }}>{formatInTimeZone(d, TZ, "d MMM")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h} style={{ borderBottom: "1px solid rgba(18,16,12,.07)" }}>
                <td style={{ ...S.td, color: MUTED, whiteSpace: "nowrap", verticalAlign: "top", paddingTop: 10, fontSize: ".76rem" }}>{h % 12 || 12}{h < 12 ? "am" : "pm"}</td>
                {days.map((d, di) => {
                  const appt = apptForSlot(d, h);
                  return (
                    <td key={di} style={{ ...S.td, verticalAlign: "top", padding: 6, minWidth: 88 }}>
                      {appt ? (
                        <button type="button" onClick={() => setActiveAppt(appt)}
                          style={{ width: "100%", textAlign: "left", background: GREEN, color: CREAM, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: ".75rem" }}>
                          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appt.name || "Visitor"}</div>
                          <div style={{ opacity: .75, fontSize: ".7rem" }}>{appt.service?.slice(0, 20) || "Consult"}</div>
                        </button>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeAppt && (
        <div onClick={() => setActiveAppt(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(16,33,28,.45)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 26, width: "100%", maxWidth: 380 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, color: GREEN, fontSize: "1.1rem" }}>Appointment</span>
              <button type="button" onClick={() => setActiveAppt(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: ".9rem", color: INK }}>
              <div><span style={S.muted}>When: </span><strong>{fmtWhen(activeAppt.starts_at)}</strong></div>
              <div><span style={S.muted}>Client: </span>{activeAppt.name || "—"}</div>
              <div><span style={S.muted}>Phone: </span>{activeAppt.phone || "—"}</div>
              <div><span style={S.muted}>Email: </span>{activeAppt.email || "—"}</div>
              <div><span style={S.muted}>Service: </span>{activeAppt.service || "—"}</div>
              <div><span style={S.muted}>Ref: </span><span style={S.mono}>{activeAppt.ref || "—"}</span></div>
              <div><span style={S.muted}>Status: </span><StatusBadge status={activeAppt.status} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------
function AvailabilityTab({ availability, onSave, token }: {
  availability: Availability[];
  onSave: (row: Availability) => Promise<string | null>;
  token: string;
}) {
  // Local editable state per row
  const [rows, setRows] = useState<Availability[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Record<number, { kind: "ok" | "err"; text: string }>>({});
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current && availability.length > 0) {
      setRows(availability.map((r) => ({ ...r })));
      initRef.current = true;
    } else if (availability.length > 0) {
      setRows(availability.map((r) => ({ ...r })));
    }
  }, [availability]);

  const update = (day: number, field: keyof Availability, value: unknown) => {
    setRows((prev) => prev.map((r) => r.day_of_week === day ? { ...r, [field]: value } : r));
  };

  const save = async (row: Availability) => {
    setSaving(row.day_of_week);
    setMsgs((m) => ({ ...m, [row.day_of_week]: undefined as unknown as { kind: "ok" | "err"; text: string } }));
    const err = await onSave(row);
    setMsgs((m) => ({ ...m, [row.day_of_week]: err ? { kind: "err", text: err } : { kind: "ok", text: "Saved" } }));
    setSaving(null);
    if (!err) setTimeout(() => setMsgs((m) => { const n = { ...m }; delete n[row.day_of_week]; return n; }), 2000);
  };

  if (rows.length === 0) return <Empty>{availability.length === 0 ? "Loading availability…" : "No schedule rows."}</Empty>;

  return (
    <div style={{ padding: 20 }}>
      <p style={{ color: MUTED, fontSize: ".84rem", marginBottom: 18 }}>
        Set the firm's weekly consultation schedule (Jamaica time). Changes apply to all future slot calculations immediately.
      </p>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <Th>Day</Th>
              <Th>Start time</Th>
              <Th>End time</Th>
              <Th>Slot (min)</Th>
              <Th>Active</Th>
              <Th>Save</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const msg = msgs[row.day_of_week];
              return (
                <tr key={row.day_of_week} style={S.tr}>
                  <Td><span style={S.strong}>{DAY_NAMES[row.day_of_week] ?? `Day ${row.day_of_week}`}</span></Td>
                  <Td>
                    <input type="time" value={row.start_time.slice(0, 5)} style={S.fieldInput}
                      onChange={(e) => update(row.day_of_week, "start_time", e.target.value + ":00")} />
                  </Td>
                  <Td>
                    <input type="time" value={row.end_time.slice(0, 5)} style={S.fieldInput}
                      onChange={(e) => update(row.day_of_week, "end_time", e.target.value + ":00")} />
                  </Td>
                  <Td>
                    <input type="number" min={5} max={120} value={row.slot_duration_minutes} style={{ ...S.fieldInput, width: 70 }}
                      onChange={(e) => update(row.day_of_week, "slot_duration_minutes", parseInt(e.target.value, 10) || 20)} />
                  </Td>
                  <Td>
                    <input type="checkbox" checked={row.active}
                      onChange={(e) => update(row.day_of_week, "active", e.target.checked)}
                      style={{ width: 18, height: 18, cursor: "pointer" }} />
                  </Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button type="button" onClick={() => void save(row)} disabled={saving === row.day_of_week}
                        style={{ ...S.waBtn, ...(saving === row.day_of_week ? S.btnOff : null) }}>
                        {saving === row.day_of_week ? "Saving…" : "Save"}
                      </button>
                      {msg && <span style={{ fontSize: ".78rem", color: msg.kind === "ok" ? "#2e7d4f" : "#a23b3b" }}>{msg.text}</span>}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <BlockedDatesPanel token={token} />
    </div>
  );
}

function BlockedDatesPanel({ token }: { token: string }) {
  const supabase = createClient();
  const [blocked, setBlocked] = useState<{ id: string; starts_at: string }[]>([]);
  const [pickedDate, setPickedDate] = useState("");
  const [daySlots, setDaySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const blockedSet = new Set(blocked.map(b => new Date(b.starts_at).toISOString()));

  const loadBlocked = useCallback(async () => {
    const { data } = await supabase.rpc("fl_admin_list_blocked_slots", { p_token: token });
    setBlocked((data as typeof blocked) ?? []);
  }, [token]);

  useEffect(() => { void loadBlocked(); }, [loadBlocked]);

  useEffect(() => {
    if (!pickedDate) { setDaySlots([]); return; }
    setLoadingSlots(true);
    fetch(`/api/booking/slots?service=general&days=60`)
      .then(r => r.json())
      .then((res: { days?: { date: string; slots: { iso: string }[] }[] }) => {
        const day = (res.days ?? []).find(d => d.date === pickedDate);
        setDaySlots(day ? day.slots.map(s => s.iso) : []);
      })
      .catch(() => setDaySlots([]))
      .finally(() => setLoadingSlots(false));
  }, [pickedDate]);

  async function toggleSlot(iso: string) {
    const existing = blocked.find(b => new Date(b.starts_at).toISOString() === new Date(iso).toISOString());
    setSaving(true); setErr(null);
    if (existing) {
      await supabase.rpc("fl_admin_unblock_slot", { p_token: token, p_id: existing.id });
    } else {
      const { error } = await supabase.rpc("fl_admin_block_slot", { p_token: token, p_starts_at: iso });
      if (error) { setErr(error.message); setSaving(false); return; }
    }
    await loadBlocked();
    setSaving(false);
  }

  async function unblock(id: string) {
    await supabase.rpc("fl_admin_unblock_slot", { p_token: token, p_id: id });
    void loadBlocked();
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-JM", { hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });

  const fmtFull = (iso: string) =>
    new Date(iso).toLocaleString("en-JM", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Jamaica" });

  return (
    <div style={{ padding: "28px 20px 8px", borderTop: `1px solid ${"#e7e1d6"}`, marginTop: 8 }}>
      <div style={{ fontWeight: 700, fontSize: ".9rem", color: GREEN, marginBottom: 6 }}>Block Unavailable Slots</div>
      <p style={{ color: MUTED, fontSize: ".82rem", marginBottom: 16 }}>
        Pick a date, then tap individual time slots to block or unblock them. Blocked slots appear as unavailable to clients.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <input type="date" value={pickedDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => setPickedDate(e.target.value)}
          style={{ ...S.fieldInput, width: 170 }} />
        {loadingSlots && <span style={{ color: MUTED, fontSize: ".82rem" }}>Loading slots…</span>}
      </div>

      {pickedDate && !loadingSlots && (
        <div style={{ marginBottom: 22 }}>
          {daySlots.length === 0
            ? <p style={{ color: MUTED, fontSize: ".82rem" }}>No scheduled slots on this day.</p>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {daySlots.map(iso => {
                  const isBlocked = blockedSet.has(new Date(iso).toISOString());
                  return (
                    <button key={iso} onClick={() => void toggleSlot(iso)} disabled={saving}
                      style={{
                        padding: "6px 14px", borderRadius: 999, fontSize: ".8rem", fontWeight: 600,
                        cursor: saving ? "not-allowed" : "pointer",
                        border: `1.5px solid ${isBlocked ? "#c0392b" : "#e7e1d6"}`,
                        background: isBlocked ? "#fbeaea" : "#f8f6f1",
                        color: isBlocked ? "#a23b3b" : "#3a3a3a",
                        textDecoration: isBlocked ? "line-through" : "none",
                      }}>
                      {fmtTime(iso)}{isBlocked ? " ✕" : ""}
                    </button>
                  );
                })}
              </div>
          }
        </div>
      )}

      {err && <p style={{ color: "#a23b3b", fontSize: ".82rem", marginBottom: 10 }}>{err}</p>}

      <div style={{ fontWeight: 600, fontSize: ".82rem", color: MUTED, marginBottom: 10 }}>
        Blocked slots ({blocked.length})
      </div>
      {blocked.length === 0
        ? <p style={{ color: MUTED, fontSize: ".82rem" }}>None blocked.</p>
        : <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 16 }}>
            {blocked.map(b => (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px 5px 14px", borderRadius: 999,
                background: "#fbeaea", border: "1.5px solid #eecaca", fontSize: ".8rem", color: "#7a2020"
              }}>
                <span>{fmtFull(b.starts_at)}</span>
                <button onClick={() => void unblock(b.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#a23b3b", fontWeight: 700, fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
const WA_BOT_URL = "https://whatsapp-jarvis-bot-production.up.railway.app/send";

function ChatsTable({ convos, loading }: { convos: Conversation[]; loading: boolean }) {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [waText, setWaText] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function sendWhatsApp() {
    if (!selected?.visitor_phone || !waText.trim() || waSending) return;
    setWaSending(true); setWaResult(null);
    try {
      const phone = selected.visitor_phone.replace(/\D/g, "");
      const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
      const secret = process.env.NEXT_PUBLIC_WHATSAPP_BOT_SECRET ?? "";
      const res = await fetch(WA_BOT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-send-secret": secret },
        body: JSON.stringify({ jid, text: waText.trim() }),
      });
      if (res.ok) { setWaResult({ ok: true, msg: "Sent via WhatsApp" }); setWaText(""); }
      else { setWaResult({ ok: false, msg: `Failed (${res.status})` }); }
    } catch (e) {
      setWaResult({ ok: false, msg: e instanceof Error ? e.message : "Send failed" });
    }
    setWaSending(false);
  }

  if (loading && convos.length === 0) return <Empty>Loading chats…</Empty>;
  if (convos.length === 0) return <Empty>No conversations yet.</Empty>;
  return (
    <div style={{ display: "flex", height: "calc(100vh - 300px)", minHeight: 400, overflow: "hidden" }}>
      {/* List */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid rgba(18,16,12,.1)", overflowY: "auto" }}>
        {convos.map((c) => (
          <button key={c.id} type="button" onClick={() => { setSelected(c); setWaResult(null); setWaText(""); }}
            style={{ display: "block", width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              padding: "12px 14px", background: selected?.id === c.id ? "rgba(16,42,30,.06)" : "#fff",
              borderBottom: "1px solid rgba(18,16,12,.07)",
              borderLeft: selected?.id === c.id ? `3px solid ${GOLD}` : "3px solid transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: ".85rem", color: GREEN }}>{c.visitor_name || "Website visitor"}</span>
              <StatusBadge status={c.status} />
            </div>
            <div style={{ fontSize: ".78rem", color: MUTED, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message || "No messages"}</div>
            <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 2 }}>{fmtDate(c.last_message_at)}</div>
          </button>
        ))}
      </div>
      {/* Detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {!selected ? (
          <div style={{ color: MUTED, textAlign: "center", paddingTop: 60 }}>Select a conversation</div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.1rem", color: GREEN }}>{selected.visitor_name || "Website visitor"}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                {selected.visitor_email && <span style={{ fontSize: ".82rem", color: MUTED }}>{selected.visitor_email}</span>}
                {selected.visitor_phone && <span style={{ fontSize: ".82rem", color: MUTED }}>{selected.visitor_phone}</span>}
              </div>
              <div style={{ marginTop: 8 }}><StatusBadge status={selected.status} /></div>
            </div>
            <div style={{ padding: "14px 16px", background: "#faf8f2", borderRadius: 10, marginBottom: 16, borderLeft: `3px solid ${GOLD}` }}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>Last message</div>
              <div style={{ fontSize: ".9rem", color: INK }}>{selected.last_message || "—"}</div>
              <div style={{ fontSize: ".74rem", color: MUTED, marginTop: 4 }}>{fmtDate(selected.last_message_at)}</div>
            </div>
            <a href="/agent" style={{ ...S.waBtn, display: "inline-block", marginBottom: 20 }}>Open in Agent Console</a>
            {selected.visitor_phone && (
              <div style={{ borderTop: "1px solid rgba(18,16,12,.1)", paddingTop: 16 }}>
                <div style={{ fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>Reply via WhatsApp</div>
                <textarea value={waText} onChange={(e) => setWaText(e.target.value)} rows={3}
                  placeholder="Type a WhatsApp message…"
                  style={{ width: "100%", resize: "vertical", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", padding: "10px 12px", fontSize: ".9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <button type="button" onClick={() => void sendWhatsApp()} disabled={waSending || !waText.trim()}
                    style={{ ...S.authBtn, width: "auto", padding: "10px 20px", ...(waSending || !waText.trim() ? S.btnOff : null) }}>
                    {waSending ? "Sending…" : "Send via WhatsApp"}
                  </button>
                  {waResult && <span style={{ fontSize: ".82rem", color: waResult.ok ? "#2e7d4f" : "#a23b3b" }}>{waResult.msg}</span>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function OverviewPanel({ leads, appts, convos, matters, homePros, emails, inquiries, staleLeads, isJordan, onTab }: {
  leads: Lead[]; appts: Appointment[]; convos: Conversation[]; matters: Matter[];
  homePros: HomePro[]; emails: InboundEmail[]; inquiries: HomeInquiry[];
  staleLeads: Lead[]; isJordan: boolean;
  onTab: (t: Tab) => void;
}) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;

  const newLeads7d = leads.filter((l) => new Date(l.created_at).getTime() > sevenDaysAgo).length;
  const upcomingBookings = appts.filter((a) => {
    const t = new Date(a.starts_at).getTime();
    return t >= now && t <= sevenDaysAhead && a.status !== "cancelled";
  }).length;
  const activeMatters = matters.filter((m) => !["closed"].includes(m.stage)).length;
  const openChats = convos.filter((c) => c.status === "waiting_agent" || c.status === "agent").length;
  const pendingProApprovals = homePros.length;
  const unreadEmails = emails.filter((e) => !e.read).length;

  const cards: { label: string; value: number; urgent?: boolean; tab?: Tab; note?: string }[] = [
    { label: "New leads (7d)", value: newLeads7d, urgent: newLeads7d > 0, tab: "leads" },
    { label: "Upcoming bookings (7d)", value: upcomingBookings, tab: "bookings" },
    { label: "Active matters", value: activeMatters, tab: "matters" },
    { label: "Open chats", value: openChats, urgent: openChats > 0, tab: "chats" },
    { label: "H.O.M.E. pro approvals", value: pendingProApprovals, urgent: pendingProApprovals > 0, tab: "home_pros" },
    { label: "Unread emails", value: unreadEmails, urgent: unreadEmails > 0, tab: "email" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.15rem", fontWeight: 600, color: GREEN, marginBottom: 20, letterSpacing: "-.01em" }}>
        {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 32 }}>
        {cards.map((c) => (
          <button key={c.label} type="button" onClick={() => c.tab && onTab(c.tab)}
            style={{ textAlign: "left", background: "#fff", border: "1px solid rgba(18,16,12,.07)", borderLeft: `3px solid ${c.urgent && c.value > 0 ? GOLD : "rgba(18,16,12,.1)"}`, borderRadius: 10, padding: "16px 18px", cursor: c.tab ? "pointer" : "default" }}>
            <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontSize: "2rem", fontWeight: 700, color: c.urgent && c.value > 0 ? GREEN : MUTED, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>{c.label}</div>
          </button>
        ))}
      </div>

      {/* Follow-up queue */}
      {staleLeads.length > 0 && (
        <div style={{ background: "rgba(200,166,92,.1)", border: "1px solid rgba(200,166,92,.35)", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".07em", color: "#8a6a22", marginBottom: 10 }}>
            ⚠ Follow-up needed — {staleLeads.length} lead{staleLeads.length > 1 ? "s" : ""} not contacted in 48h
          </div>
          {staleLeads.slice(0, 4).map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid rgba(200,166,92,.2)" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: ".88rem", color: GREEN }}>{l.name || "—"}</span>
                <span style={{ color: MUTED, fontSize: ".78rem" }}> · {l.service || "—"}</span>
              </div>
              <span style={{ fontSize: ".72rem", color: "#8a6a22" }}>
                {Math.floor((Date.now() - new Date(l.created_at).getTime()) / (3600 * 1000))}h ago
              </span>
            </div>
          ))}
          <button type="button" onClick={() => onTab("leads")}
            style={{ marginTop: 10, fontSize: ".78rem", fontWeight: 600, color: "#8a6a22", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            View all leads →
          </button>
        </div>
      )}

      {/* Conversion funnel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".07em", color: MUTED, marginBottom: 12 }}>Conversion funnel</div>
        <FunnelChart leads={leads} appts={appts} matters={matters} />
      </div>

      <div style={{ fontWeight: 700, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".06em", color: MUTED, marginBottom: 12 }}>Recent leads</div>
      <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        {leads.slice(0, 5).map((l, i) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i > 0 ? "1px solid rgba(18,16,12,.06)" : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: ".88rem", color: GREEN }}>{l.name || "—"}</div>
              <div style={{ fontSize: ".78rem", color: MUTED }}>{l.service || "—"} · {fmtDate(l.created_at)}</div>
            </div>
            <StatusBadge status={l.status} />
          </div>
        ))}
        {leads.length === 0 && <div style={{ padding: "18px 16px", color: MUTED, fontSize: ".88rem" }}>No leads yet.</div>}
      </div>

      <div style={{ fontWeight: 700, fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".06em", color: MUTED, marginBottom: 12 }}>Upcoming appointments</div>
      <div style={{ background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 12, overflow: "hidden" }}>
        {appts.filter(a => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled").slice(0, 5).map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i > 0 ? "1px solid rgba(18,16,12,.06)" : "none" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: ".88rem", color: GREEN }}>{a.name || "—"}</div>
              <div style={{ fontSize: ".78rem", color: MUTED }}>{a.service || "—"} · {fmtWhen(a.starts_at)}</div>
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
        {appts.filter(a => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled").length === 0 && (
          <div style={{ padding: "18px 16px", color: MUTED, fontSize: ".88rem" }}>No upcoming appointments.</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email inbox
// ---------------------------------------------------------------------------
function EmailTab({ emails, token, onMarkRead }: {
  emails: InboundEmail[]; token: string; onMarkRead: (id: string) => void;
}) {
  const [selected, setSelected] = useState<InboundEmail | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [newTo, setNewTo] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  async function suggestReply() {
    if (!selected || suggesting) return;
    setSuggesting(true);
    const res = await fetch("/api/admin/suggest-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, subject: selected.subject, body: selected.body_text }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; suggestion?: string };
    if (json.ok && json.suggestion) { setReplyBody(json.suggestion); setReplyOpen(true); }
    setSuggesting(false);
  }

  function selectEmail(e: InboundEmail) {
    setSelected(e);
    setReplyOpen(false);
    setReplyBody("");
    setSendResult(null);
    if (!e.read) {
      void fetch("/api/admin/email-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: e.id }),
      });
      onMarkRead(e.id);
    }
  }

  async function sendReply() {
    if (!selected || !replyBody.trim() || sending) return;
    setSending(true); setSendResult(null);
    const to = selected.reply_to || selected.from_email;
    const subject = selected.subject ? (selected.subject.startsWith("Re:") ? selected.subject : `Re: ${selected.subject}`) : "Re: (no subject)";
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, to, subject, body: replyBody.trim(), replyToId: selected.id }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (json.ok) { setSendResult({ ok: true, msg: `Sent to ${to}` }); setReplyBody(""); setReplyOpen(false); }
    else { setSendResult({ ok: false, msg: json.error ?? "Send failed" }); }
    setSending(false);
  }

  async function sendCompose() {
    if (!newTo.trim() || !newSubject.trim() || !newBody.trim() || sending) return;
    setSending(true); setSendResult(null);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, to: newTo.trim(), subject: newSubject.trim(), body: newBody.trim() }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (json.ok) { setSendResult({ ok: true, msg: `Sent to ${newTo}` }); setComposing(false); setNewTo(""); setNewSubject(""); setNewBody(""); }
    else { setSendResult({ ok: false, msg: json.error ?? "Send failed" }); }
    setSending(false);
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 300px)", minHeight: 400, overflow: "hidden" }}>
      {/* Inbox list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid rgba(18,16,12,.1)", overflowY: "auto" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(18,16,12,.08)" }}>
          <button type="button" onClick={() => { setComposing(true); setSelected(null); }}
            style={{ ...S.authBtn, width: "100%", padding: "9px 16px", fontSize: ".82rem" }}>
            + Compose
          </button>
        </div>
        {emails.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: MUTED, fontSize: ".86rem" }}>No inbound emails yet.</div>
        ) : emails.map((e) => (
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
            </div>
            <div style={{ fontSize: ".78rem", color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject || "(no subject)"}</div>
            <div style={{ fontSize: ".72rem", color: MUTED, marginTop: 2 }}>{fmtDate(e.created_at)}</div>
          </button>
        ))}
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {composing ? (
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
            {sendResult && <p style={{ fontSize: ".82rem", color: sendResult.ok ? "#2e7d4f" : "#a23b3b", marginBottom: 10 }}>{sendResult.msg}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => void sendCompose()} disabled={sending || !newTo.trim() || !newBody.trim()}
                style={{ ...S.authBtn, width: "auto", padding: "10px 22px", ...(sending || !newTo.trim() || !newBody.trim() ? S.btnOff : null) }}>
                {sending ? "Sending…" : "Send"}
              </button>
              <button type="button" onClick={() => { setComposing(false); setSendResult(null); }}
                style={{ padding: "10px 18px", border: "1px solid rgba(18,16,12,.2)", borderRadius: 999, background: "#fff", fontSize: ".88rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : !selected ? (
          <div style={{ color: MUTED, textAlign: "center", paddingTop: 60 }}>Select an email to read</div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--serif, Georgia, serif)", fontWeight: 700, fontSize: "1.15rem", color: GREEN }}>{selected.subject || "(no subject)"}</div>
              <div style={{ fontSize: ".8rem", color: MUTED, marginTop: 4 }}>
                From: <strong style={{ color: INK }}>{selected.from_name ? `${selected.from_name} <${selected.from_email}>` : selected.from_email}</strong>
                &nbsp;·&nbsp;{fmtDate(selected.created_at)}
              </div>
              {selected.to_email && <div style={{ fontSize: ".8rem", color: MUTED }}>To: {selected.to_email}</div>}
            </div>
            <div style={{ background: "#faf8f2", borderRadius: 10, padding: 20, marginBottom: 20, fontSize: ".9rem", lineHeight: 1.7, color: INK, whiteSpace: "pre-wrap", minHeight: 100 }}>
              {selected.body_text || selected.body_html?.replace(/<[^>]+>/g, "") || "(empty)"}
            </div>
            {!replyOpen ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button type="button" onClick={() => setReplyOpen(true)}
                  style={{ ...S.authBtn, width: "auto", padding: "9px 22px" }}>
                  Reply
                </button>
                <button type="button" onClick={() => void suggestReply()} disabled={suggesting}
                  style={{ padding: "9px 18px", borderRadius: 999, border: `1px solid ${GOLD}`, background: "rgba(200,166,92,.08)", color: "#8a6a22", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", ...(suggesting ? S.btnOff : null) }}>
                  {suggesting ? "Thinking…" : "✦ AI draft"}
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
  // Cross-reference with appointments by ref field
  for (const a of appts) {
    const src = a.ref || "direct";
    // Find matching leads by ref
    const matching = leads.filter((l) => l.ref === src || ((!l.ref) && src === "direct"));
    if (matching.length > 0) {
      const key = src;
      if (refMap[key]) refMap[key].booked++;
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
    <div style={{ display: "grid", gap: 14 }}>
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
  const retained = matters.filter(m => ["retainer","active","closed"].includes(m.stage)).length;
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
  { key: "enquiry",              label: "Enquiry" },
  { key: "consultation_booked", label: "Booked" },
  { key: "consultation_done",   label: "Consulted" },
  { key: "retainer",            label: "Retainer" },
  { key: "active",              label: "Active" },
  { key: "closed",              label: "Closed" },
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
  authCard: { background: "#fbf8f1", borderRadius: 18, padding: "34px 30px", width: "100%", maxWidth: 380, textAlign: "center", boxShadow: "0 30px 70px -24px rgba(0,0,0,.55)" },
  brandMark: { fontFamily: "var(--serif, Georgia, serif)", fontWeight: 600, fontSize: "1.4rem", color: GREEN, letterSpacing: ".01em" },
  authTitle: { fontFamily: "var(--serif, Georgia, serif)", fontSize: "1.05rem", color: INK, margin: "8px 0 4px" },
  authSub: { color: MUTED, fontSize: ".85rem", marginBottom: 18 },
  authInput: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(18,16,12,.2)", fontSize: ".95rem", marginBottom: 12, outline: "none", boxSizing: "border-box" },
  authErr: { color: "#a23b3b", fontSize: ".8rem", margin: "0 0 12px" },
  authBtn: { width: "100%", padding: "12px 14px", borderRadius: 999, border: "none", background: GOLD, color: GREEN, fontWeight: 700, cursor: "pointer" },
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
  const rejectPro = useCallback(async (userId: string) => {
    await fetch(`${HR_URL}/rest/v1/home_professional_profiles?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": HR_KEY, "Authorization": `Bearer ${HR_KEY}`,
        "Content-Type": "application/json", "Prefer": "return=minimal",
      },
      body: JSON.stringify({ verified: false }),
    });
  }, []);

  if (loading && pros.length === 0) return <Empty>Loading H.O.M.E. professionals…</Empty>;
  if (pros.length === 0) return <Empty>No professionals awaiting verification.</Empty>;
  return (
    <div style={{ display: "grid", gap: 14, padding: 20 }}>
      {pros.map((p) => (
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
  source_of_funds: string | null;
  is_pep: boolean;
  pep_details: string | null;
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
  pending:     { bg: "#f5f5f5", color: "#888",    border: "#ddd" },
  in_progress: { bg: "#fdf3d9", color: "#8a6a22", border: "#e8d090" },
  done:        { bg: "#dff0df", color: "#1a4d28", border: "#a5d4a5" },
  blocked:     { bg: "#fbeaea", color: "#7a2020", border: "#eecaca" },
};

const MATTER_STATUS_OPTS = ["intake","in_progress","awaiting_client","awaiting_third_party","completed","on_hold"];
const MILESTONE_STATUS_OPTS = ["pending","in_progress","done","blocked"];

function CmsTab({ token }: { token: string }) {
  const supabase = createClient();
  const [matters, setMatters] = useState<CmsMatter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<CmsMilestone[]>([]);
  const [messages, setMessages] = useState<CmsMessage[]>([]);
  const [files, setFiles] = useState<CmsFile[]>([]);
  const [kyc, setKyc] = useState<CmsKyc | null>(null);
  const [payments, setPayments] = useState<CmsPayment[]>([]);
  const [tab, setTab] = useState<"timeline"|"messages"|"files"|"kyc"|"payments">("timeline");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openMatter, setOpenMatter] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientHits, setClientHits] = useState<CmsClientHit[]>([]);
  const [newClientId, setNewClientId] = useState("");
  const [newClientLabel, setNewClientLabel] = useState("");
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
    setMilestones((mRes.data as CmsMilestone[]) ?? []);
    setMessages((msgRes.data as CmsMessage[]) ?? []);
    setFiles((fRes.data as CmsFile[]) ?? []);
    const kycRows = kRes.data as CmsKyc[] | null;
    setKyc(kycRows?.[0] ?? null);
    setKycNotes(kycRows?.[0]?.reviewer_notes ?? "");
    setPayments((pRes.data as CmsPayment[]) ?? []);
    setDetailLoading(false);
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

  async function updateMatterStatus(id: string, status: string) {
    await supabase.rpc("fl_admin_cms_update_matter_status", { p_token: token, p_matter_id: id, p_status: status });
    setMatters(prev => prev.map(m => m.id === id ? { ...m, status } : m));
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
    if (!newClientId.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { data, error } = await supabase.rpc("fl_admin_cms_open_matter", {
        p_token: token, p_client_id: newClientId, p_workflow_type: newWorkflow,
        p_title: newTitle || null,
      });
      if (error) throw error;
      if (!data) throw new Error("No matter ID returned — check the RPC returned a value.");
      const { data: refreshed } = await supabase.rpc("fl_admin_cms_matters", { p_token: token });
      setMatters((refreshed as CmsMatter[]) ?? []);
      setOpenMatter(false);
      setNewClientId(""); setNewClientLabel(""); setClientQuery(""); setClientHits([]); setNewTitle("");
      void loadDetail(data as string);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
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
    <div style={{ display: "flex", height: "calc(100vh - 260px)", minHeight: 500, overflow: "hidden" }}>
      {/* Left sidebar */}
      <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid rgba(18,16,12,.1)`, overflowY: "auto", padding: "16px 12px" }}>
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
              {m.workflow_type?.replace("_", " ") || m.matter_type}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{m.title || m.client_name}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{m.client_email}</div>
            <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, background: "rgba(18,16,12,.07)", borderRadius: 999, padding: "2px 7px" }}>{m.status}</span>
              {m.kyc_status !== "approved" && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#8a6a22", background: "rgba(200,166,92,.2)", borderRadius: 999, padding: "2px 7px" }}>KYC {m.kyc_status}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Right pane */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
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
                    {activeMatter.workflow_type?.replace("_", " ") || activeMatter.matter_type}
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
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid rgba(18,16,12,.1)`, background: "#fafaf8" }}>
              {(["timeline","messages","files","kyc","payments"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 600, border: "none",
                  background: "none", cursor: "pointer", color: tab === t ? INK : MUTED,
                  borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
                }}>
                  {t === "messages" ? `Messages (${messages.length})`
                    : t === "files" ? `Files (${files.length})`
                    : t === "kyc" ? `KYC/AML${kyc && kyc.status !== "approved" ? " •" : ""}`
                    : t === "payments" ? `Payments (${payments.length})`
                    : "Timeline"}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {/* TIMELINE */}
              {tab === "timeline" && (
                <div>
                  {phaseList.length === 0 ? (
                    <p style={{ color: MUTED, fontSize: 14 }}>No milestones. This matter may not have a workflow template.</p>
                  ) : phaseList.map(([orderStr, phase]) => {
                    const done = phase.items.filter(i => i.status === "done").length;
                    const pct = Math.round((done / phase.items.length) * 100);
                    return (
                      <div key={orderStr} style={{ marginBottom: 26 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: GREEN }}>{phase.name}</span>
                          <span style={{ fontSize: 12, color: MUTED }}>{done}/{phase.items.length}</span>
                        </div>
                        <div style={{ height: 4, background: "#eee", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a4d28" : GOLD, borderRadius: 4, transition: "width .3s" }} />
                        </div>
                        {phase.items.map(m => {
                          const mc = MS_COLORS[m.status] ?? MS_COLORS.pending;
                          return (
                            <div key={m.id} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                              background: m.status === "in_progress" ? "#fffbf0" : "#fff",
                              border: `1px solid ${m.status === "in_progress" ? "#f0e4b0" : "rgba(18,16,12,.08)"}`,
                            }}>
                              <span style={{ fontSize: 13, flex: 1, color: m.status === "done" ? MUTED : INK,
                                textDecoration: m.status === "done" ? "line-through" : "none" }}>
                                {m.name}
                              </span>
                              <select
                                value={m.status}
                                onChange={e => updateMilestone(m.id, e.target.value)}
                                style={{
                                  fontSize: 11.5, padding: "3px 7px", borderRadius: 7, fontWeight: 700,
                                  border: `1px solid ${mc.border}`, background: mc.bg, color: mc.color, cursor: "pointer",
                                }}
                              >
                                {MILESTONE_STATUS_OPTS.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
                              </select>
                            </div>
                          );
                        })}
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
                    <p style={{ color: MUTED, fontSize: 13.5 }}>No KYC/AML submission on file yet for this client.</p>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                          background: kyc.status === "approved" ? "rgba(47,122,82,.16)" : kyc.status === "flagged" ? "rgba(122,32,32,.12)" : "rgba(200,166,92,.2)",
                          color: kyc.status === "approved" ? "#2f7a52" : kyc.status === "flagged" ? "#7a2020" : "#8a6a22",
                        }}>{kyc.status}</span>
                        {kyc.submitted_at && <span style={{ fontSize: 12, color: MUTED }}>Submitted {fmtDate(kyc.submitted_at)}</span>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        {[["Full legal name", kyc.full_legal_name], ["Date of birth", kyc.date_of_birth], ["Nationality", kyc.nationality],
                          ["ID type", kyc.id_type], ["ID number", kyc.id_number], ["Address", kyc.address],
                          ["Source of funds", kyc.source_of_funds], ["Politically exposed?", kyc.is_pep ? "Yes" : "No"]].map(([label, val]) => (
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
                          {p.kind} · JMD {p.amount_jmd.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 11.5, color: MUTED }}>
                          {p.method?.replace("_"," ") || "—"}{p.reference ? ` · ${p.reference}` : ""} · {fmtDate(p.created_at)}
                        </div>
                        {p.receipt_number && <div style={{ fontSize: 11.5, color: "#2f7a52", fontWeight: 600, marginTop: 2 }}>Receipt {p.receipt_number}</div>}
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
                {newClientId ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: `1px solid ${GOLD}`, background: "#fffbf0" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{newClientLabel}</span>
                    <button type="button" onClick={() => { setNewClientId(""); setNewClientLabel(""); setClientQuery(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 16 }}>×</button>
                  </div>
                ) : (
                  <>
                    <input value={clientQuery} onChange={e => setClientQuery(e.target.value)}
                      placeholder="Search by client email…"
                      style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(18,16,12,.2)", fontSize: 13, outline: "none" }} />
                    {clientHits.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid rgba(18,16,12,.15)", borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,.1)", zIndex: 5, maxHeight: 180, overflowY: "auto" }}>
                        {clientHits.map(c => (
                          <button key={c.id} type="button" onClick={() => { setNewClientId(c.id); setNewClientLabel(`${c.full_name} <${c.email}>`); setClientHits([]); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13 }}>
                            <div style={{ fontWeight: 600, color: INK }}>{c.full_name}</div>
                            <div style={{ fontSize: 11.5, color: MUTED }}>{c.email}</div>
                          </button>
                        ))}
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
                  <option value="general">General</option>
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
              <button onClick={() => void createMatter()} disabled={creating || !newClientId.trim()}
                style={{ flex: 1, background: GREEN, color: CREAM, border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: creating || !newClientId.trim() ? 0.6 : 1 }}>
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
