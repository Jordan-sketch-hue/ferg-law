"use client";
import { useState, useEffect, useRef } from "react";

const ADVANCE_INTERVAL = 90; // seconds between auto-advances
const PORTAL_URL = "https://fergusonlawja.com/directory/client-login";
const EMAIL = "portal-tester@fergusonlawja.com";
const PASSWORD = "TestPortal2026";

interface Milestone { phase_order: number; phase_name: string; name: string; status: string; }

export default function PortalTestRunner() {
  const [notifyEmail, setNotifyEmail] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(ADVANCE_INTERVAL);
  const [done, setDone] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"email" | "pass" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    const res = await fetch("/api/testing/matter-status");
    const data = await res.json() as Milestone[];
    setMilestones(data);
    if (data.every(m => m.status === "done")) setDone(true);
  }

  async function advance() {
    if (!sessionId) return;
    const res = await fetch("/api/testing/advance-matter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const data = await res.json() as { done: boolean; milestone: string | null };
    if (data.milestone) setLastCompleted(data.milestone);
    if (data.done) { setDone(true); clearIntervals(); }
    void fetchStatus();
    setCountdown(ADVANCE_INTERVAL);
  }

  function clearIntervals() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countRef.current) clearInterval(countRef.current);
  }

  async function startTest() {
    if (!notifyEmail.trim()) { setError("Enter the email where you want to receive notifications."); return; }
    setStarting(true); setError("");
    const res = await fetch("/api/testing/start-portal-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify_email: notifyEmail.trim() }),
    });
    const data = await res.json() as { session_id?: string; error?: string };
    if (!res.ok || !data.session_id) { setError(data.error ?? "Could not start test."); setStarting(false); return; }
    setSessionId(data.session_id);
    await fetchStatus();
    setStarting(false);
    setCountdown(ADVANCE_INTERVAL);

    timerRef.current = setInterval(advance, ADVANCE_INTERVAL * 1000);
    countRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
  }

  function copy(text: string, which: "email" | "pass") {
    void navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  useEffect(() => () => clearIntervals(), []);

  const phases = milestones.reduce<Record<number, { name: string; items: Milestone[] }>>((acc, m) => {
    if (!acc[m.phase_order]) acc[m.phase_order] = { name: m.phase_name, items: [] };
    acc[m.phase_order].items.push(m);
    return acc;
  }, {});

  const completed = milestones.filter(m => m.status === "done").length;
  const total = milestones.length;

  if (!sessionId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#0e2518", borderRadius: 12, padding: "18px 22px" }}>
          <p style={{ color: "#c9a86a", fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Portal login credentials</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[{ label: "Email", val: EMAIL, key: "email" as const }, { label: "Password", val: PASSWORD, key: "pass" as const }].map(({ label, val, key }) => (
              <div key={key} style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#9fb3ab", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginTop: 2 }}>{val}</div>
                </div>
                <button type="button" onClick={() => copy(val, key)}
                  style={{ background: copied === key ? "#2a7a4b" : "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {copied === key ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Your real email — notifications will arrive here
          </label>
          <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)}
            placeholder="yourname@example.com"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e0ddd6", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#faf9f6" }} />
        </div>
        {error && <p style={{ color: "#c0392b", fontSize: 13, margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => void startTest()} disabled={starting}
            style={{ flex: 1, background: "#10211c", color: "#c9a86a", border: "none", borderRadius: 10, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: starting ? "not-allowed" : "pointer", opacity: starting ? 0.6 : 1 }}>
            {starting ? "Starting..." : "Start portal test"}
          </button>
          <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, background: "#fff", color: "#10211c", border: "1.5px solid #e0ddd6", borderRadius: 10, padding: "13px 20px", fontWeight: 600, fontSize: 14, textDecoration: "none", textAlign: "center" }}>
            Open client portal
          </a>
        </div>
        <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.6 }}>
          Once started, your matter will auto-advance one milestone every 90 seconds. You will receive an email for each step. Log into the portal with the credentials above to watch it update in real time.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#2a7a4b", marginBottom: 12 }}>Test complete</div>
        <p style={{ color: "#555", marginBottom: 20 }}>All {total} milestones advanced. Check your inbox — you should have received {total} notification emails.</p>
        <a href="/testing" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", background: "#b8872a", color: "#fff", padding: "13px 30px", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Submit feedback
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 6 }}>
          <span>{completed} of {total} milestones completed</span>
          <span>Next advance in {countdown}s</span>
        </div>
        <div style={{ height: 6, background: "#f0ede6", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#b8872a", borderRadius: 99, width: `${total ? (completed / total) * 100 : 0}%`, transition: "width .5s" }} />
        </div>
      </div>

      {lastCompleted && (
        <div style={{ background: "#eafaf2", border: "1px solid #a8ddc1", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#2a7a4b", fontWeight: 600 }}>
          Email sent: &ldquo;{lastCompleted}&rdquo; just completed. Check your inbox.
        </div>
      )}

      {/* Milestone phases */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(phases).map(([order, phase]) => (
          <div key={order} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "1px solid #ede8de" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b8872a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Phase {order} — {phase.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {phase.items.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    background: m.status === "done" ? "#2a7a4b" : m.status === "in_progress" ? "#b8872a" : "#e0ddd6",
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 13, color: m.status === "done" ? "#888" : "#1a1a1a", textDecoration: m.status === "done" ? "line-through" : "none" }}>
                    {m.name}
                  </span>
                  {m.status === "in_progress" && (
                    <span style={{ fontSize: 10, background: "#fffbf0", border: "1px solid #e0c060", borderRadius: 5, padding: "1px 7px", color: "#b8872a", fontWeight: 700 }}>ACTIVE</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => void advance()}
          style={{ flex: 1, background: "#10211c", color: "#c9a86a", border: "none", borderRadius: 10, padding: "11px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Advance now
        </button>
        <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: "#fff", border: "1.5px solid #e0ddd6", borderRadius: 10, padding: "11px 16px", fontWeight: 600, fontSize: 13, textDecoration: "none", color: "#10211c", textAlign: "center" }}>
          Open portal
        </a>
      </div>
    </div>
  );
}
