"use client";
import { useState } from "react";
import type { Listing } from "@/lib/partners/constants";

function fmt(n: number) {
  return "J$" + n.toLocaleString();
}

export default function ListingCards({ listings }: { listings: Listing[] }) {
  const [active, setActive] = useState<Listing | null>(null);

  return (
    <>
      <div className="listing-grid">
        {listings.map((l) => {
          const cover = (l.media ?? []).find((m: { type: string }) => m.type === "image");
          return (
            <button
              key={l.id}
              className="listing-card"
              style={{ textAlign: "left", cursor: "pointer", background: "none", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", width: "100%", padding: 0 }}
              onClick={() => setActive(l)}
            >
              <div
                className="lmedia"
                style={cover ? { backgroundImage: `url("${(cover as { url: string }).url}")` } : undefined}
              />
              <div className="lbody">
                <h4>{l.title}</h4>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {l.parish || "—"}
                  {l.bedrooms ? ` · ${l.bedrooms} bd` : ""}
                  {l.bathrooms ? ` · ${l.bathrooms} ba` : ""}
                </div>
                {l.price_jmd ? <div className="price">{fmt(l.price_jmd)}</div> : null}
                {l.description && (
                  <p style={{ fontSize: 13.5, color: "var(--text)", marginTop: 6 }}>{l.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,.55)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setActive(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 18, maxWidth: 560, width: "100%",
              maxHeight: "90vh", overflowY: "auto", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const cover = (active.media ?? []).find((m: { type: string }) => m.type === "image");
              return (
                <>
                  {cover && (
                    <div
                      style={{
                        width: "100%", aspectRatio: "16/9",
                        backgroundImage: `url("${(cover as { url: string }).url}")`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        borderRadius: "18px 18px 0 0",
                      }}
                    />
                  )}
                  <div style={{ padding: "20px 24px 28px" }}>
                    <button
                      onClick={() => setActive(null)}
                      style={{
                        position: "absolute", top: 14, right: 16, background: "rgba(0,0,0,.45)",
                        color: "#fff", border: "none", borderRadius: 999, width: 32, height: 32,
                        cursor: "pointer", fontSize: 18, lineHeight: 1, display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                      aria-label="Close"
                    >×</button>

                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", marginBottom: 6 }}>
                      {active.title}
                    </h3>

                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                      {active.parish || "Jamaica"}
                      {active.bedrooms ? ` · ${active.bedrooms} bd` : ""}
                      {active.bathrooms ? ` · ${active.bathrooms} ba` : ""}
                    </div>

                    {active.price_jmd ? (
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gold-deep)", marginBottom: 12 }}>
                        {fmt(active.price_jmd)}
                      </div>
                    ) : null}

                    {active.description && (
                      <p style={{ fontSize: 14.5, color: "var(--text)", lineHeight: 1.6, marginBottom: 16 }}>
                        {active.description}
                      </p>
                    )}

                    {active.address && (
                      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                        📍 {active.address}
                      </div>
                    )}

                    <div style={{ paddingTop: 14, borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                      To enquire about this listing, contact the professional above.
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
