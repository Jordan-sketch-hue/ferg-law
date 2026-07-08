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

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  active: boolean;
}

type Tab = "leads" | "bookings" | "clients" | "matters" | "calendar" | "chats" | "invites" | "directory" | "availability";

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
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);

  const [tab, setTab] = useState<Tab>("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
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
    setClients((list.data as Client[] | null) ?? []);
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

  const signOut = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    setToken(null); setLeads([]); setAppts([]); setConvos([]);
    setInvites([]); setListings([]); setClients([]); setMatters([]); setAvailability([]);
  }, []);

  // Stats
  const newLeads = leads.filter((l) => (l.status ?? "new") === "new").length;
  const pendingBookings = appts.filter((a) => a.status === "pending").length;
  const openChats = convos.filter((c) => c.status === "waiting_agent" || c.status === "agent").length;
  const pendingListings = listings.filter((l) => (l.status ?? "pending") === "pending").length;

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
              <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submitLogin()} placeholder="Password"
                style={{ ...S.authInput, marginTop: 10 }} aria-label="Password" autoComplete="current-password" />
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
          <Stat label="New leads" value={newLeads} />
          <Stat label="Pending bookings" value={pendingBookings} />
          <Stat label="Open chats" value={openChats} />
          <Stat label="Clients" value={clients.length} />
          <Stat label="Matters" value={matters.length} />
          <Stat label="Pending partners" value={pendingListings} />
        </div>

        {loadError && <div style={S.errorBar}>{loadError}</div>}

        <div style={{ ...S.tabs, flexWrap: "wrap" }}>
          {(["leads","bookings","clients","matters","calendar","chats","invites","directory","availability"] as Tab[]).map((t) => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              count={t === "leads" ? leads.length : t === "bookings" ? appts.length :
                t === "clients" ? clients.length : t === "matters" ? matters.length :
                t === "chats" ? convos.length : t === "invites" ? invites.length :
                t === "directory" ? listings.length : t === "availability" ? availability.length :
                appts.length /* calendar shows appt count */}
            />
          ))}
        </div>

        <div style={S.panel}>
          {tab === "leads" && <LeadsTable leads={leads} loading={loading} onStatus={setLeadStatus} />}
          {tab === "bookings" && <BookingsTable appts={appts} loading={loading} onStatus={setApptStatus} />}
          {tab === "clients" && <ClientsTab clients={clients} matters={matters} loading={loading} onUpsert={upsertClient} />}
          {tab === "matters" && <MattersTab matters={matters} loading={loading} onStage={setMatterStage} onPayment={setMatterPayment} />}
          {tab === "calendar" && <CalendarTab appts={appts} />}
          {tab === "chats" && <ChatsTable convos={convos} loading={loading} />}
          {tab === "invites" && <InvitesPanel invites={invites} loading={loading} onCreate={createInvite} />}
          {tab === "directory" && <ListingsPanel listings={listings} loading={loading} onStatus={setListingStatus} />}
          {tab === "availability" && <AvailabilityTab availability={availability} onSave={saveAvailability} />}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={S.statCard}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
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
function Td({ children }: { children: React.ReactNode }) { return <td style={S.td}>{children}</td>; }
function Empty({ children }: { children: React.ReactNode }) { return <div style={S.emptyState}>{children}</div>; }

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
function LeadsTable({ leads, loading, onStatus }: { leads: Lead[]; loading: boolean; onStatus: (id: string, s: string) => void }) {
  if (loading && leads.length === 0) return <Empty>Loading leads…</Empty>;
  if (leads.length === 0) return <Empty>No leads yet.</Empty>;
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><Th>Date</Th><Th>Name</Th><Th>Contact</Th><Th>Service</Th><Th>Source</Th><Th>Message</Th><Th>Status</Th><Th>Action</Th></tr></thead>
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
                <Td>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" style={S.waBtn}>WhatsApp</a> : <span style={S.muted}>—</span>}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
function BookingsTable({ appts, loading, onStatus }: { appts: Appointment[]; loading: boolean; onStatus: (id: string, s: string) => void }) {
  if (loading && appts.length === 0) return <Empty>Loading bookings…</Empty>;
  if (appts.length === 0) return <Empty>No bookings yet.</Empty>;
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><Th>When (Jamaica)</Th><Th>Service</Th><Th>Client</Th><Th>Contact</Th><Th>Ref</Th><Th>Status</Th></tr></thead>
        <tbody>
          {appts.map((a) => (
            <tr key={a.id} style={S.tr}>
              <Td><span style={S.strong}>{fmtWhen(a.starts_at)}</span></Td>
              <Td>{a.service || "—"}</Td>
              <Td>{a.name || "—"}</Td>
              <Td><div style={S.contactCol}>{a.email && <span>{a.email}</span>}{a.phone && <span style={S.muted}>{a.phone}</span>}{!a.email && !a.phone && <span style={S.muted}>—</span>}</div></Td>
              <Td><span style={S.mono}>{a.ref || "—"}</span></Td>
              <Td><StatusSelect value={a.status} options={APPT_STATUSES} onChange={(v) => onStatus(a.id, v)} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function ClientsTab({ clients, matters, loading, onUpsert }: {
  clients: Client[]; matters: Matter[]; loading: boolean;
  onUpsert: (f: { name: string; email: string; phone: string; type: string; country: string; notes: string }) => Promise<string | null>;
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
              <thead><tr><Th>Name</Th><Th>Contact</Th><Th>Type</Th><Th>Country</Th><Th>Status</Th><Th>Source</Th><Th>Date</Th><Th>Matters</Th></tr></thead>
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
                      </tr>
                      {expanded === c.id && cms.map((m) => (
                        <tr key={m.id} style={{ ...S.tr, background: "#faf8f2" }}>
                          <td colSpan={8} style={{ ...S.td, paddingLeft: 32 }}>
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

function MattersTab({ matters, loading, onStage, onPayment }: {
  matters: Matter[]; loading: boolean;
  onStage: (id: string, s: string) => void; onPayment: (id: string, s: string) => void;
}) {
  if (loading && matters.length === 0) return <Empty>Loading matters…</Empty>;
  if (matters.length === 0) return <Empty>No matters yet. They are created automatically when consultations are booked via the chatbot.</Empty>;
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><Th>Ref</Th><Th>Client</Th><Th>Type</Th><Th>Stage</Th><Th>Priority</Th><Th>Payment</Th><Th>Description</Th><Th>Date</Th></tr></thead>
        <tbody>
          {matters.map((m) => (
            <tr key={m.id} style={S.tr}>
              <Td><span style={S.mono}>{m.ref}</span></Td>
              <Td><span style={S.strong}>{m.client_name || "—"}</span></Td>
              <Td><TypeBadge type={m.matter_type} colors={MATTER_TYPE_COLORS} /></Td>
              <Td><StatusSelect value={m.stage} options={MATTER_STAGES} onChange={(v) => onStage(m.id, v)} /></Td>
              <Td><TypeBadge type={m.priority} colors={PRIORITY_COLORS} /></Td>
              <Td><StatusSelect value={m.payment_status} options={PAYMENT_STATUSES} onChange={(v) => onPayment(m.id, v)} /></Td>
              <Td><div style={S.msgCell} title={m.description ?? ""}>{m.description || "—"}</div></Td>
              <Td>{fmtDate(m.created_at)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
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
function AvailabilityTab({ availability, onSave }: {
  availability: Availability[];
  onSave: (row: Availability) => Promise<string | null>;
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
function ChatsTable({ convos, loading }: { convos: Conversation[]; loading: boolean }) {
  if (loading && convos.length === 0) return <Empty>Loading chats…</Empty>;
  if (convos.length === 0) return <Empty>No conversations yet.</Empty>;
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr><Th>Status</Th><Th>Visitor</Th><Th>Contact</Th><Th>Last message</Th><Th>Last activity</Th><Th>Reply</Th></tr></thead>
        <tbody>
          {convos.map((c) => (
            <tr key={c.id} style={S.tr}>
              <Td><StatusBadge status={c.status} /></Td>
              <Td><span style={S.strong}>{c.visitor_name || "Website visitor"}</span></Td>
              <Td><div style={S.contactCol}>{c.visitor_email && <span>{c.visitor_email}</span>}{c.visitor_phone && <span style={S.muted}>{c.visitor_phone}</span>}{!c.visitor_email && !c.visitor_phone && <span style={S.muted}>—</span>}</div></Td>
              <Td><div style={S.msgCell} title={c.last_message ?? ""}>{c.last_message || "—"}</div></Td>
              <Td>{fmtDate(c.last_message_at)}</Td>
              <Td><a href="/agent" style={S.waBtn}>Open</a></Td>
            </tr>
          ))}
        </tbody>
      </table>
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

function InvitesPanel({ invites, loading, onCreate }: {
  invites: Invite[]; loading: boolean;
  onCreate: (args: { code: string; label: string; maxUses: number; expires: string | null }) => Promise<string | null>;
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
              <thead><tr><Th>Code</Th><Th>Label</Th><Th>Uses</Th><Th>Expires</Th><Th>Active</Th><Th>Share link</Th></tr></thead>
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
  shell: { minHeight: "100dvh", background: CREAM, fontFamily: "var(--sans, system-ui, sans-serif)", color: INK },
  topbar: { background: GREEN, color: CREAM, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  brandMarkSm: { fontFamily: "var(--serif, Georgia, serif)", fontWeight: 600, fontSize: "1.25rem", color: CREAM },
  topSub: { fontSize: ".76rem", color: GOLD, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2 },
  topActions: { display: "flex", gap: 10 },
  ghostBtn: { padding: "9px 18px", borderRadius: 999, border: "1px solid rgba(246,242,234,.3)", background: "transparent", color: CREAM, fontWeight: 600, fontSize: ".82rem", cursor: "pointer" },
  body: { maxWidth: 1280, margin: "0 auto", padding: "24px 20px 60px" },
  statStrip: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 22 },
  statCard: { background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 12px 30px -22px rgba(0,0,0,.4)" },
  statValue: { fontFamily: "var(--serif, Georgia, serif)", fontSize: "2rem", fontWeight: 700, color: GREEN, lineHeight: 1 },
  statLabel: { fontSize: ".78rem", color: MUTED, marginTop: 6, textTransform: "uppercase", letterSpacing: ".05em" },
  errorBar: { background: "rgba(190,60,60,.1)", border: "1px solid rgba(190,60,60,.3)", color: "#a23b3b", borderRadius: 10, padding: "10px 14px", fontSize: ".85rem", marginBottom: 16 },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid rgba(18,16,12,.12)", marginBottom: 18 },
  tab: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", borderBottom: "2px solid transparent", background: "transparent", color: MUTED, fontWeight: 600, fontSize: ".86rem", cursor: "pointer", marginBottom: -1 },
  tabActive: { color: GREEN, borderBottomColor: GOLD },
  tabCount: { fontSize: ".7rem", fontWeight: 700, padding: "1px 8px", borderRadius: 999, background: "rgba(18,16,12,.08)", color: MUTED },
  tabCountActive: { background: GREEN, color: CREAM },
  panel: { background: "#fff", border: "1px solid rgba(18,16,12,.08)", borderRadius: 14, overflow: "hidden", boxShadow: "0 14px 36px -26px rgba(0,0,0,.4)" },
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
};
