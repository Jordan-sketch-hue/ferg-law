"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Summary = {
  objective: string;
  recommendation: string;
  how_we_assist: string;
  expected_timing: string;
  what_happens_next: string;
  created_at: string;
};

type MatterData = {
  preliminary_summary: Summary | null;
  client_name: string | null;
  title: string | null;
  matter_type: string | null;
};

function SummaryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matterId = params.id as string;
  const token = searchParams.get("token") ?? "";

  const [data, setData] = useState<MatterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matterId || !token) { setError("Missing parameters."); setLoading(false); return; }
    fetch(`/api/admin/cms/preliminary-summary?token=${encodeURIComponent(token)}&matterId=${encodeURIComponent(matterId)}`)
      .then(r => r.json())
      .then((j: { ok: boolean; summary?: MatterData | null; error?: string }) => {
        if (!j.ok) { setError(j.error ?? "Failed to load."); return; }
        setData(j.summary as MatterData | null);
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [matterId, token]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f2" }}>
      <div style={{ color: "#888", fontSize: 14 }}>Loading summary…</div>
    </div>
  );

  if (error || !data?.preliminary_summary) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f2" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#1a1a1a" }}>Ferguson Law</div>
        <div style={{ color: "#888", fontSize: 14 }}>{error ?? "No preliminary summary has been issued for this matter yet."}</div>
      </div>
    </div>
  );

  const s = data.preliminary_summary;
  const matterLabel = data.title || (data.matter_type ? data.matter_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Matter");

  const sections = [
    { label: "Your Objective", value: s.objective },
    { label: "Our Recommendation", value: s.recommendation },
    { label: "How We Would Assist", value: s.how_we_assist },
    { label: "Expected Timing", value: s.expected_timing },
    { label: "What Happens Next", value: s.what_happens_next },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9f7f2", fontFamily: "'Georgia', serif", padding: "40px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a6a22", fontWeight: 700, marginBottom: 8 }}>Ferguson Law</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Preliminary Summary</div>
          <div style={{ fontSize: 14, color: "#666" }}>{matterLabel}</div>
          {s.created_at && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
              Issued {new Date(s.created_at).toLocaleDateString("en-JM", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8d9a0", overflow: "hidden", marginBottom: 32 }}>
          {sections.map((sec, i) => (
            <div key={sec.label} style={{
              padding: "20px 24px",
              borderBottom: i < sections.length - 1 ? "1px solid #f0e8cc" : "none",
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a6a22", fontWeight: 700, marginBottom: 8 }}>
                {sec.label}
              </div>
              <div style={{ fontSize: 15, color: "#2d2d2d", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {sec.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, textAlign: "center", marginBottom: 24 }}>
          This summary is preliminary and does not constitute formal legal advice.<br />
          A formal engagement agreement will follow upon confirmation to proceed.
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#bbb" }}>
          Ferguson Law · (876) 320-0235 · contact@fergusonlawja.com
        </div>

      </div>
    </div>
  );
}

export default function PreliminarySummaryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f2" }}>
        <div style={{ color: "#888", fontSize: 14 }}>Loading…</div>
      </div>
    }>
      <SummaryPage />
    </Suspense>
  );
}
