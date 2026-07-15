"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { waLink } from "@/lib/site";

// ── Types ──────────────────────────────────────────────────────────────────

type MatterStatus = "intake" | "in_progress" | "awaiting_client" | "awaiting_third_party" | "completed" | "on_hold";
type MilestoneStatus = "pending" | "in_progress" | "done" | "blocked";

interface KycRecord {
  id: string;
  full_legal_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  trn: string | null;
  id_type: string | null;
  id_number: string | null;
  id_doc_url: string | null;
  source_of_funds: string | null;
  is_pep: boolean;
  submitted_at: string | null;
  status: string;
  reviewer_notes: string | null;
}

interface Payment {
  id: string;
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

interface Milestone {
  id: string;
  phase_order: number;
  phase_name: string;
  name: string;
  status: MilestoneStatus;
  completed_at: string | null;
}

interface Message {
  id: string;
  sender_type: "client" | "staff";
  sender_label: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface MatterFile {
  id: string;
  uploader_type: "client" | "staff";
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type?: string | null;
  created_at: string;
}

interface Matter {
  id: string;
  matter_type: "buying" | "selling" | "other";
  workflow_type: string | null;
  current_phase: number;
  status: MatterStatus;
  kyc_status: "pending" | "submitted" | "approved" | "flagged";
  title: string | null;
  notes: string | null;
  created_at: string;
  professional_name: string | null;
  professional_whatsapp: string | null;
  professional_phone: string | null;
  milestones: Milestone[];
  messages: Message[];
  files: MatterFile[];
}

// ── Config ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MatterStatus, { label: string; color: string; bg: string; border: string }> = {
  intake:               { label: "Intake",                               color: "#5a5200", bg: "#fdfbe7", border: "#e8e09c" },
  in_progress:          { label: "In progress",                          color: "#1a4d28", bg: "#e8f3ec", border: "#bfe0cc" },
  awaiting_client:      { label: "Action required — we need from you",   color: "#7a2020", bg: "#fbeaea", border: "#eecaca" },
  awaiting_third_party: { label: "Awaiting third party",                 color: "#2a4a7a", bg: "#e8f0fb", border: "#b8ccf0" },
  completed:            { label: "Completed",                            color: "#2a4a2a", bg: "#dff0df", border: "#a5d4a5" },
  on_hold:              { label: "On hold",                              color: "#5a5a5a", bg: "#f0f0f0", border: "#d0d0d0" },
};

const MILESTONE_DOT: Record<MilestoneStatus, { color: string; bg: string }> = {
  pending:     { color: "#aaa", bg: "#f0f0f0" },
  in_progress: { color: "#C8A65C", bg: "#fdf3d9" },
  done:        { color: "#1a4d28", bg: "#dff0df" },
  blocked:     { color: "#7a2020", bg: "#fbeaea" },
};

const TYPE_LABEL: Record<string, string> = {
  buying: "Property Purchase", selling: "Property Sale", other: "General Matter",
};

const KYC_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "KYC pending",   color: "#aaa" },
  submitted: { label: "KYC submitted", color: "#C8A65C" },
  approved:  { label: "KYC approved",  color: "#1a4d28" },
  flagged:   { label: "KYC flagged",   color: "#7a2020" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-JM", { year: "numeric", month: "short", day: "numeric" });
}
function fmtTime(date: string) {
  return new Date(date).toLocaleString("en-JM", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function groupMilestones(milestones: Milestone[]) {
  const phases: Record<number, { name: string; items: Milestone[] }> = {};
  for (const m of milestones) {
    if (!phases[m.phase_order]) phases[m.phase_order] = { name: m.phase_name, items: [] };
    phases[m.phase_order].items.push(m);
  }
  return Object.entries(phases)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([order, v]) => ({ order: Number(order), ...v }));
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ClientDashboardPage() {
  const router = useRouter();
  const _sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  const supabase = () => { if (!_sbRef.current) _sbRef.current = createClient(); return _sbRef.current; };

  const [matters, setMatters] = useState<Matter[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"timeline" | "messages" | "files" | "kyc" | "payments">("timeline");

  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycOk, setKycOk] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) { router.push("/directory/client-login"); return; }
      setClientName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setClientId(user.id);

      const { data: mattersRaw } = await supabase()
        .from("fl_client_matters")
        .select(`
          id, matter_type, workflow_type, current_phase, status, kyc_status, title, notes, created_at,
          fl_partners!professional_id (business_name, phone, whatsapp)
        `)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      const matterIds = (mattersRaw ?? []).map((m: Record<string, unknown>) => m.id as string);

      const [{ data: milestonesRaw }, { data: messagesRaw }, { data: filesRaw }] = await Promise.all([
        matterIds.length ? supabase().from("fl_matter_milestones").select("*").in("matter_id", matterIds).order("phase_order").order("created_at") : { data: [] },
        matterIds.length ? supabase().from("fl_matter_messages").select("*").in("matter_id", matterIds).order("created_at") : { data: [] },
        matterIds.length ? supabase().from("fl_matter_files").select("*").in("matter_id", matterIds).order("created_at", { ascending: false }) : { data: [] },
      ]);

      const built = (mattersRaw ?? []).map((m: Record<string, unknown>) => {
        const p = m.fl_partners as Record<string, string> | null;
        const id = m.id as string;
        return {
          id,
          matter_type: m.matter_type as Matter["matter_type"],
          workflow_type: m.workflow_type as string | null,
          current_phase: (m.current_phase as number) ?? 1,
          status: m.status as MatterStatus,
          kyc_status: (m.kyc_status as Matter["kyc_status"]) ?? "pending",
          title: m.title as string | null,
          notes: m.notes as string | null,
          created_at: m.created_at as string,
          professional_name: p?.business_name ?? null,
          professional_phone: p?.phone ?? null,
          professional_whatsapp: p?.whatsapp ?? null,
          milestones: ((milestonesRaw ?? []) as Record<string, unknown>[]).filter(x => x.matter_id === id) as unknown as Milestone[],
          messages: ((messagesRaw ?? []) as Record<string, unknown>[]).filter(x => x.matter_id === id) as unknown as Message[],
          files: ((filesRaw ?? []) as Record<string, unknown>[]).filter(x => x.matter_id === id) as unknown as MatterFile[],
        };
      });

      setMatters(built);
      if (built.length === 1) setSelected(built[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (tab === "messages") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (tab === "kyc" && kyc === null && !kycLoading) {
      setKycLoading(true);
      fetch("/api/client/kyc")
        .then(r => r.json())
        .then((j: { kyc: KycRecord | null }) => { setKyc(j.kyc); setKycLoading(false); })
        .catch(() => setKycLoading(false));
    }
    if (tab === "payments" && payments.length === 0 && !paymentsLoading && selected) {
      setPaymentsLoading(true);
      void (async () => {
        try {
          const { data } = await supabase().from("fl_matter_payments").select("*").eq("matter_id", selected).order("created_at", { ascending: false });
          setPayments((data ?? []) as Payment[]);
        } catch { /* ignore */ }
        finally { setPaymentsLoading(false); }
      })();
    }
  }, [tab, selected]);

  const activeMatter = matters.find(m => m.id === selected);

  async function sendMessage() {
    const clean = msgText.replace(/[﻿​‌‍⁠]/g, "").trim();
    if (!clean || !activeMatter) return;
    setSending(true);
    setSendError(null);
    try {
      const { data, error } = await supabase().from("fl_matter_messages").insert({
        matter_id: activeMatter.id,
        sender_id: clientId,
        sender_type: "client",
        sender_label: (clientName || "Client").replace(/[﻿]/g, ""),
        body: clean,
      }).select().single();
      if (error) throw error;
      if (data) {
        setMatters(prev => prev.map(m => m.id === activeMatter.id
          ? { ...m, messages: [...m.messages, data as Message] }
          : m
        ));
        setMsgText("");
        void fetch("/api/cms/notify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matterId: activeMatter.id, kind: "message" }),
        }).catch(() => null);
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeMatter) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `matters/${activeMatter.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase().storage.from("fl-matter-files").upload(path, file);
    if (upErr) { alert("Upload failed: " + upErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase().storage.from("fl-matter-files").getPublicUrl(path);

    const { data } = await supabase().from("fl_matter_files").insert({
      matter_id: activeMatter.id,
      uploader_id: clientId,
      uploader_type: "client",
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
    }).select().single();

    if (data) {
      setMatters(prev => prev.map(m => m.id === activeMatter.id
        ? { ...m, files: [data as MatterFile, ...m.files] }
        : m
      ));
      void fetch("/api/cms/notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matterId: activeMatter.id, kind: "file", fileName: file.name }),
      }).catch(() => null);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSignOut() {
    await supabase().auth.signOut();
    router.push("/directory/client-login");
  }

  return (
    <div className="dir-wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold-deep)", fontWeight: 700 }}>
            Client Portal — Ferguson Law
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(22px,4vw,32px)", color: "var(--ink)", marginTop: 6 }}>
            {clientName ? `Welcome back, ${clientName.split(" ")[0]}` : "Your matters"}
          </h1>
        </div>
        <button onClick={onSignOut} className="link-btn" style={{ fontSize: 13 }}>Sign out</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading your matters…</p>
      ) : matters.length === 0 ? (
        <div className="dir-empty">
          <h3>No active matters</h3>
          <p>Your Ferguson Law matters will appear here once set up by the firm.{" "}
            <a href={waLink()} target="_blank" rel="noopener" style={{ color: "var(--ink)", fontWeight: 600 }}>Message us on WhatsApp</a>.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Sidebar — matter list */}
          {matters.length > 1 && (
            <aside style={{ width: 220, flexShrink: 0 }}>
              {matters.map(m => {
                const s = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.intake;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelected(m.id); setTab("timeline"); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 14px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
                      border: `1.5px solid ${selected === m.id ? "var(--gold)" : "var(--line)"}`,
                      background: selected === m.id ? "#fffbf0" : "#fff",
                    }}
                  >
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--gold-deep)", fontWeight: 700, marginBottom: 3 }}>
                      {TYPE_LABEL[m.matter_type] ?? "Matter"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                      {m.title || TYPE_LABEL[m.matter_type]}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, color: s.color }}>{s.label}</div>
                  </button>
                );
              })}
            </aside>
          )}

          {/* Main pane */}
          {activeMatter ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <MatterPane
                matter={activeMatter}
                tab={tab}
                setTab={setTab}
                msgText={msgText}
                setMsgText={setMsgText}
                sending={sending}
                uploading={uploading}
                onSendMessage={sendMessage}
                onUpload={uploadFile}
                fileRef={fileRef}
                messagesEndRef={messagesEndRef}
                sendError={sendError}
                kyc={kyc}
                kycLoading={kycLoading}
                kycSubmitting={kycSubmitting}
                kycError={kycError}
                kycOk={kycOk}
                onKycSubmit={async (fields) => {
                  setKycSubmitting(true); setKycError(null); setKycOk(false);
                  try {
                    const r = await fetch("/api/client/kyc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
                    const j = await r.json() as { ok?: boolean; error?: string };
                    if (!r.ok || j.error) throw new Error(j.error ?? "Submission failed.");
                    setKycOk(true);
                    setKyc(prev => prev ? { ...prev, status: "submitted", submitted_at: new Date().toISOString(), ...fields } : null);
                  } catch (e) { setKycError(e instanceof Error ? e.message : "Submission failed."); }
                  finally { setKycSubmitting(false); }
                }}
                payments={payments}
                paymentsLoading={paymentsLoading}
              />
            </div>
          ) : (
            <div style={{ flex: 1, textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
              Select a matter to view details
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 36, paddingTop: 22, borderTop: "1px solid var(--line)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/" className="btn btn-ghost" style={{ fontSize: 13 }}>← Back to Ferguson Law</Link>
        <a href={waLink()} target="_blank" rel="noopener" className="btn btn-gold" style={{ fontSize: 13 }}>Contact Ferguson Law</a>
      </div>
    </div>
  );
}

// ── MatterPane ──────────────────────────────────────────────────────────────

function MatterPane({
  matter, tab, setTab, msgText, setMsgText, sending, uploading,
  onSendMessage, onUpload, fileRef, messagesEndRef, sendError,
  kyc, kycLoading, kycSubmitting, kycError, kycOk, onKycSubmit,
  payments, paymentsLoading,
}: {
  matter: Matter;
  tab: "timeline" | "messages" | "files" | "kyc" | "payments";
  setTab: (t: "timeline" | "messages" | "files" | "kyc" | "payments") => void;
  msgText: string;
  setMsgText: (v: string) => void;
  sending: boolean;
  uploading: boolean;
  onSendMessage: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  sendError: string | null;
  kyc: KycRecord | null;
  kycLoading: boolean;
  kycSubmitting: boolean;
  kycError: string | null;
  kycOk: boolean;
  onKycSubmit: (fields: Record<string, unknown>) => Promise<void>;
  payments: Payment[];
  paymentsLoading: boolean;
}) {
  const s = STATUS_CONFIG[matter.status] ?? STATUS_CONFIG.intake;
  const phases = groupMilestones(matter.milestones);
  const unread = matter.messages.filter(m => m.sender_type === "staff" && !m.read_at).length;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "#fff", overflow: "hidden" }}>
      {/* Matter header */}
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--gold-deep)", fontWeight: 700, marginBottom: 4 }}>
              {TYPE_LABEL[matter.matter_type] ?? "Matter"}
            </div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", margin: 0 }}>
              {matter.title || TYPE_LABEL[matter.matter_type]}
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
              Opened {fmt(matter.created_at)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <span style={{
              background: s.bg, color: s.color, border: `1px solid ${s.border}`,
              borderRadius: 999, padding: "5px 12px", fontSize: 12.5, fontWeight: 600,
            }}>{s.label}</span>
          </div>
        </div>
        {matter.notes && (
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--text)", lineHeight: 1.55, background: "var(--paper)", borderRadius: 10, padding: "10px 13px" }}>
            {matter.notes}
          </p>
        )}
        {matter.professional_name && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Assigned: <strong style={{ color: "var(--ink)" }}>{matter.professional_name}</strong>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {matter.professional_whatsapp && (
                <a href={`https://wa.me/${matter.professional_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener"
                  className="btn btn-gold" style={{ fontSize: 12, padding: "6px 14px" }}>WhatsApp</a>
              )}
              {matter.professional_phone && (
                <a href={`tel:${matter.professional_phone}`} className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>Call</a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "#fafaf8", overflowX: "auto" }}>
        {(["timeline", "messages", "files", "kyc", "payments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "11px 16px", fontSize: 13, fontWeight: 600, border: "none", background: "none",
            cursor: "pointer", whiteSpace: "nowrap",
            color: tab === t ? "var(--ink)" : "var(--muted)",
            borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent",
          }}>
            {t === "timeline" ? "Progress" : t === "messages" ? (
              <>Messages{unread > 0 && <span style={{ marginLeft: 6, background: "#C8A65C", color: "#fff", borderRadius: 999, fontSize: 11, padding: "1px 6px" }}>{unread}</span>}</>
            ) : t === "files" ? "Files" : t === "kyc" ? "Identity (KYC)" : "Payments"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "22px" }}>
        {/* TIMELINE */}
        {tab === "timeline" && (
          <div>
            {phases.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No milestones set up yet.</p>
            ) : (
              phases.map(phase => {
                const doneCount = phase.items.filter(i => i.status === "done").length;
                const isActive = phase.items.some(i => i.status === "in_progress");
                const pct = Math.round((doneCount / phase.items.length) * 100);
                return (
                  <div key={phase.order} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                          background: pct === 100 ? "#dff0df" : isActive ? "#fdf3d9" : "#f0f0f0",
                          color: pct === 100 ? "#1a4d28" : isActive ? "#C8A65C" : "#aaa",
                        }}>{phase.order}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{phase.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{doneCount}/{phase.items.length}</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: "#f0f0f0", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#1a4d28" : "#C8A65C", borderRadius: 4, transition: "width .4s" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {phase.items.map(m => {
                        const dot = MILESTONE_DOT[m.status];
                        return (
                          <div key={m.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 10px", borderRadius: 8,
                            background: m.status === "in_progress" ? "#fffbf0" : "transparent",
                            border: m.status === "in_progress" ? "1px solid #f0e4b0" : "1px solid transparent",
                          }}>
                            <span style={{
                              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                              background: dot.bg, border: `2px solid ${dot.color}`,
                            }} />
                            <span style={{
                              fontSize: 13, color: m.status === "done" ? "var(--muted)" : "var(--ink)",
                              textDecoration: m.status === "done" ? "line-through" : "none",
                              flex: 1,
                            }}>{m.name}</span>
                            {m.status === "done" && m.completed_at && (
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmt(m.completed_at)}</span>
                            )}
                            {m.status === "in_progress" && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#C8A65C" }}>Active</span>
                            )}
                            {m.status === "blocked" && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#7a2020" }}>Blocked</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* MESSAGES */}
        {tab === "messages" && (
          <div>
            <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {matter.messages.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No messages yet. Send the firm a message below.</p>
              ) : (
                matter.messages.map(msg => (
                  <div key={msg.id} style={{
                    display: "flex",
                    justifyContent: msg.sender_type === "client" ? "flex-end" : "flex-start",
                  }}>
                    <div style={{
                      maxWidth: "78%",
                      padding: "10px 14px", borderRadius: 12,
                      background: msg.sender_type === "client" ? "var(--gold)" : "#f4f4f0",
                      color: msg.sender_type === "client" ? "#fff" : "var(--ink)",
                      fontSize: 13.5, lineHeight: 1.5,
                    }}>
                      {msg.sender_type === "staff" && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: .7 }}>
                          {msg.sender_label || "Ferguson Law"}
                        </div>
                      )}
                      <div>{msg.body}</div>
                      <div style={{ fontSize: 10.5, marginTop: 4, opacity: .6, textAlign: "right" }}>
                        {fmtTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            {sendError && (
              <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "#fbeaea", border: "1px solid #eecaca", fontSize: 13, color: "#7a2020" }}>
                {sendError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
                rows={2}
                placeholder="Type a message… (Enter to send)"
                style={{
                  flex: 1, resize: "none", borderRadius: 10, border: "1px solid var(--line)",
                  padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none",
                }}
              />
              <button onClick={onSendMessage} disabled={sending || !msgText.trim()}
                className="btn btn-gold" style={{ fontSize: 13, padding: "10px 18px", height: "auto" }}>
                {sending ? "…" : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* IDENTITY / KYC */}
        {tab === "identity" && <KycTab clientId={clientId} />}

        {/* FILES */}
        {tab === "files" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <input type="file" ref={fileRef} onChange={onUpload} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="btn btn-ghost" style={{ fontSize: 13 }}>
                {uploading ? "Uploading…" : "+ Upload document"}
              </button>
            </div>
            {matter.files.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No files yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {matter.files.map(f => (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#fafaf8", textDecoration: "none" }}>
                    <span style={{ fontSize: 20 }}>{f.mime_type?.includes("pdf") ? "📄" : f.mime_type?.includes("image") ? "🖼️" : "📎"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.file_name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {f.uploader_type === "client" ? "You" : "Ferguson Law"} · {fmtTime(f.created_at)}
                        {f.file_size && ` · ${(f.file_size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--gold-deep)", fontWeight: 600 }}>↓</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KYC */}
        {tab === "kyc" && (
          <KycTab
            kyc={kyc}
            loading={kycLoading}
            submitting={kycSubmitting}
            error={kycError}
            submitted={kycOk}
            onSubmit={onKycSubmit}
          />
        )}

        {/* PAYMENTS */}
        {tab === "payments" && (
          <div>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 16, lineHeight: 1.55 }}>
              Payments confirmed by Ferguson Law appear here. Contact us on WhatsApp with any payment queries.
            </p>
            {paymentsLoading ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
            ) : payments.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No payments recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {payments.map(p => {
                  const confirmed = p.status === "confirmed";
                  return (
                    <div key={p.id} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid var(--line)", background: "#fafaf8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                            JMD {p.amount_jmd.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                            {p.kind}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · Ref: ${p.reference}` : ""}
                          </div>
                        </div>
                        <span style={{
                          padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: confirmed ? "#dff0df" : "#f0f0f0",
                          color: confirmed ? "#1a4d28" : "#5a5a5a",
                          border: confirmed ? "1px solid #a5d4a5" : "1px solid #d0d0d0",
                        }}>
                          {confirmed ? "Confirmed" : "Pending"}
                        </span>
                      </div>
                      {confirmed && p.confirmed_at && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                          Confirmed {fmt(p.confirmed_at)}
                          {p.receipt_issued && p.receipt_number && ` · Receipt #${p.receipt_number}`}
                        </div>
                      )}
                      {p.receipt_issued && (
                        <div style={{ marginTop: 8, fontSize: 12.5, color: "#1a4d28", fontWeight: 600 }}>
                          Receipt issued — contact us if you need a PDF copy
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── KycTab ──────────────────────────────────────────────────────────────────

function KycTab({ kyc, loading, submitting, error, submitted, onSubmit }: {
  kyc: KycRecord | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
  onSubmit: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    full_legal_name: kyc?.full_legal_name ?? "",
    date_of_birth: kyc?.date_of_birth ?? "",
    nationality: kyc?.nationality ?? "",
    address: kyc?.address ?? "",
    trn: kyc?.trn ?? "",
    id_type: kyc?.id_type ?? "national_id",
    id_number: kyc?.id_number ?? "",
    source_of_funds: kyc?.source_of_funds ?? "",
    is_pep: kyc?.is_pep ?? false,
  });

  useEffect(() => {
    if (kyc) setForm({
      full_legal_name: kyc.full_legal_name ?? "",
      date_of_birth: kyc.date_of_birth ?? "",
      nationality: kyc.nationality ?? "",
      address: kyc.address ?? "",
      trn: kyc.trn ?? "",
      id_type: kyc.id_type ?? "national_id",
      id_number: kyc.id_number ?? "",
      source_of_funds: kyc.source_of_funds ?? "",
      is_pep: kyc.is_pep ?? false,
    });
  }, [kyc]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>;

  const isApproved = kyc?.status === "approved";
  const isSubmitted = kyc?.status === "submitted";

  const statusBanner = isApproved ? (
    <div style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 10, background: "#dff0df", border: "1px solid #a5d4a5", fontSize: 13.5, color: "#1a4d28", fontWeight: 600 }}>
      Your identity has been verified. No further action needed.
    </div>
  ) : isSubmitted ? (
    <div style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 10, background: "#fdf3d9", border: "1px solid #f0e4b0", fontSize: 13.5, color: "#5a5200" }}>
      Your KYC information has been submitted and is under review. We will notify you of the outcome.
    </div>
  ) : kyc?.status === "flagged" ? (
    <div style={{ marginBottom: 18, padding: "10px 14px", borderRadius: 10, background: "#fbeaea", border: "1px solid #eecaca", fontSize: 13.5, color: "#7a2020" }}>
      Your submission was flagged for review.{kyc.reviewer_notes ? ` Note from Ferguson Law: ${kyc.reviewer_notes}` : " Please update and resubmit below."}
    </div>
  ) : null;

  return (
    <div>
      <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
        Ferguson Law is required by law to verify the identity of all clients (Know Your Customer / KYC). Please fill in your details accurately.
      </p>
      {statusBanner}
      {submitted && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "#dff0df", border: "1px solid #a5d4a5", fontSize: 13.5, color: "#1a4d28", fontWeight: 600 }}>
          KYC submitted successfully. Ferguson Law will review your information shortly.
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "#fbeaea", border: "1px solid #eecaca", fontSize: 13, color: "#7a2020" }}>
          {error}
        </div>
      )}
      {!isApproved && (
        <form onSubmit={async e => { e.preventDefault(); await onSubmit(form); }} noValidate>
          <div style={{ display: "grid", gap: 14 }}>
            <KycField label="Full legal name (as on ID)">
              <input value={form.full_legal_name} onChange={e => set("full_legal_name", e.target.value)} required placeholder="e.g. Jane Mary Smith" />
            </KycField>
            <KycField label="Date of birth">
              <input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} required />
            </KycField>
            <KycField label="Nationality">
              <input value={form.nationality} onChange={e => set("nationality", e.target.value)} placeholder="e.g. Jamaican" />
            </KycField>
            <KycField label="Residential address">
              <textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)}
                placeholder="Full street address" style={{ resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", width: "100%", boxSizing: "border-box" }} />
            </KycField>
            <KycField label="TRN (Tax Registration Number)">
              <input value={form.trn} onChange={e => set("trn", e.target.value)} placeholder="000-000-000" />
            </KycField>
            <KycField label="ID type">
              <select value={form.id_type} onChange={e => set("id_type", e.target.value)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, background: "#fff" }}>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="drivers_licence">Driver&apos;s Licence</option>
              </select>
            </KycField>
            <KycField label="ID number">
              <input value={form.id_number} onChange={e => set("id_number", e.target.value)} required placeholder="As printed on your ID" />
            </KycField>
            <KycField label="Source of funds">
              <input value={form.source_of_funds} onChange={e => set("source_of_funds", e.target.value)} placeholder="e.g. Employment, savings, sale of property" />
            </KycField>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_pep} onChange={e => set("is_pep", e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--gold)", width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                I am or have been a Politically Exposed Person (PEP) — a senior government official, politician, judge, or close associate of one.
              </span>
            </label>
          </div>
          <button type="submit" disabled={submitting} className="btn btn-gold" style={{ marginTop: 20, width: "100%" }}>
            {submitting ? "Submitting…" : isSubmitted ? "Re-submit KYC" : "Submit KYC"}
          </button>
        </form>
      )}
    </div>
  );
}

function KycField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dform-field" style={{ margin: 0 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
