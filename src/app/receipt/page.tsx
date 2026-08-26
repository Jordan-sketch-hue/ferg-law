"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface ReceiptData {
  receipt_number: string;
  amount_jmd: number;
  kind: string;
  method: string | null;
  reference: string | null;
  confirmed_at: string | null;
  created_at: string;
  matter_title: string;
  matter_type: string;
  client_name: string | null;
  client_email: string | null;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-JM", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function ReceiptInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const token = params.get("token");
  const [data, setData] = useState<ReceiptData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) { setErr("Missing receipt ID or token."); return; }
    fetch(`/api/admin/cms/receipt?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((j: { data?: ReceiptData; error?: string }) => {
        if (j.error) setErr(j.error);
        else if (j.data) setData(j.data);
        else setErr("Receipt not found.");
      })
      .catch(() => setErr("Could not load receipt."));
  }, [id, token]);

  if (err) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Georgia,serif", color: "#a23b3b" }}>
      {err}
    </div>
  );
  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Georgia,serif", color: "#9a8f7a" }}>
      Loading…
    </div>
  );

  const confirmedDate = data.confirmed_at || data.created_at;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .receipt-card { box-shadow: none !important; border: none !important; max-width: 100% !important; }
        }
        body { background: #f4f1ec; margin: 0; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f4f1ec", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", fontFamily: "Georgia,'Times New Roman',serif" }}>
        <div className="receipt-card" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e7e1d6", boxShadow: "0 4px 32px rgba(0,0,0,.09)", width: "100%", maxWidth: 580 }}>

          {/* Header */}
          <div style={{ background: "#10211c", padding: "28px 36px 24px" }}>
            <div style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: "#c9a86a", marginBottom: 6 }}>Ferguson Law</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Official Receipt</div>
                <div style={{ fontSize: 12, color: "#9fb3ab", marginTop: 6 }}>Ferguson Law Jamaica &nbsp;·&nbsp; (876) 320-0235</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#c9a86a" }}>#{data.receipt_number}</div>
                <div style={{ fontSize: 11.5, color: "#9fb3ab", marginTop: 4 }}>{fmt(confirmedDate)}</div>
              </div>
            </div>
          </div>

          {/* Client / Matter row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #ece6da" }}>
            <div style={{ padding: "18px 36px", borderRight: "1px solid #ece6da" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f7a", marginBottom: 6 }}>Client</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1c" }}>{data.client_name || "—"}</div>
              {data.client_email && <div style={{ fontSize: 11.5, color: "#9a8f7a", marginTop: 2 }}>{data.client_email}</div>}
            </div>
            <div style={{ padding: "18px 36px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9a8f7a", marginBottom: 6 }}>Matter</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1c" }}>{data.matter_title || data.matter_type}</div>
              <div style={{ fontSize: 11.5, color: "#9a8f7a", marginTop: 2, textTransform: "lowercase" }}>{data.matter_type}</div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#10211c" }}>
                <th style={{ padding: "10px 36px", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#c9a86a", textAlign: "left" }}>Description</th>
                <th style={{ padding: "10px 24px", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#c9a86a", textAlign: "left" }}>Method</th>
                <th style={{ padding: "10px 36px", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#c9a86a", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "16px 36px", fontSize: 14, fontWeight: 700, color: "#1c1c1c", textTransform: "capitalize", borderBottom: "1px solid #f0ede6" }}>{data.kind}</td>
                <td style={{ padding: "16px 24px", fontSize: 13.5, color: "#3a3a3a", textTransform: "capitalize", borderBottom: "1px solid #f0ede6" }}>{(data.method || "—").replace(/_/g, " ")}</td>
                <td style={{ padding: "16px 36px", fontSize: 14, fontWeight: 700, color: "#1c1c1c", textAlign: "right", borderBottom: "1px solid #f0ede6" }}>J${data.amount_jmd.toLocaleString("en-JM")}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ padding: "14px 36px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#9a8f7a" }}>Total Received</td>
                <td style={{ padding: "14px 36px", fontSize: 16, fontWeight: 700, color: "#10211c", textAlign: "right" }}>J${data.amount_jmd.toLocaleString("en-JM")}</td>
              </tr>
            </tfoot>
          </table>

          {/* Confirmed badge */}
          <div style={{ padding: "12px 36px", borderTop: "1px solid #f0ede6", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#c9a86a" }}>Payment Confirmed</span>
            <span style={{ fontSize: 12, color: "#9a8f7a" }}>{fmt(confirmedDate)}</span>
          </div>

          {/* Footer */}
          <div style={{ padding: "20px 36px 28px", borderTop: "1px solid #ece6da", fontSize: 11.5, color: "#9a8f7a", lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 4px" }}>This receipt is issued by Ferguson Law, Jamaica. Errors and Omissions Excepted. For queries contact us at <a href="mailto:contact@fergusonlawja.com" style={{ color: "#9a8f7a" }}>contact@fergusonlawja.com</a> or (876) 320-0235.</p>
            <p style={{ margin: 0 }}>Ferguson Law is a duly registered law firm operating under the laws of Jamaica.</p>
          </div>

          {/* Print button - hidden on print */}
          <div className="no-print" style={{ padding: "0 36px 28px", display: "flex", gap: 10 }}>
            <button onClick={() => window.print()} style={{ background: "#10211c", color: "#fff", border: "none", borderRadius: 9, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Georgia,serif", color: "#9a8f7a" }}>Loading…</div>}>
      <ReceiptInner />
    </Suspense>
  );
}
