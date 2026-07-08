"use client";
import { useState } from "react";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";

const EXPLAINERS = [
  { slug: "nht", title: "Understanding NHT Loan Offerings", tags: ["Financing"] },
  { slug: "buyer", title: "Why Every Jamaican Property Buyer Needs an Attorney", tags: ["Buying"] },
  { slug: "seller", title: "Why Every Property Seller in Jamaica Needs an Attorney", tags: ["Selling"] },
  { slug: "costs", title: "What a Property Purchase in Jamaica Really Costs", tags: ["Buying", "Costs"] },
  { slug: "banker", title: "10 Things Your Banker Won't Tell You", tags: ["Financing", "Strategy"] },
  { slug: "agent", title: "10 Things to Expect from Your Real Estate Agent", tags: ["Buying", "Selling"] },
  { slug: "surveyor", title: "10 Costly Property Mistakes a Surveyor's ID Report Can Prevent", tags: ["Buying", "Due Diligence"] },
].sort((a, b) => a.title.localeCompare(b.title));

const PER_PAGE = 8;

const TAG_COLORS: Record<string, string> = {
  Buying: "#1e8a4a",
  Selling: "#c07000",
  Financing: "#2257b0",
  Costs: "#7c2aa0",
  Strategy: "#9a5c10",
  "Due Diligence": "#5a6e2a",
};

export default function GuidesClient() {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(EXPLAINERS.length / PER_PAGE);
  const visible = EXPLAINERS.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <BookingProvider>
      <Reveal />
      <Nav />

      {/* Dark header — eyebrow + title */}
      <section style={{ background: "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)", padding: "4rem 1.5rem 3rem", color: "var(--paper)" }}>
        <div className="wrap">
          <span style={{ display: "inline-block", fontSize: ".72rem", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "1rem" }}>
            Ferguson Law · Free Resources
          </span>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(2rem,4vw,3rem)", color: "#fff", margin: "0 0 .8rem" }}>
            Explainers
          </h1>
          <p style={{ color: "rgba(246,242,234,.75)", maxWidth: 520, fontSize: "1rem", lineHeight: 1.65, margin: 0 }}>
            Plain-English breakdowns of Jamaican property law — attorney-backed, no jargon.
          </p>
        </div>
      </section>

      {/* Cream card body — contrasting section */}
      <section style={{ background: "#f6f2e9", padding: "2.5rem 1.5rem 4rem" }}>
        <div className="wrap">
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {visible.map((ex) => (
              <a
                key={ex.slug}
                href={`/explainers/${ex.slug}`}
                className="guide-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: ".75rem",
                  padding: "1.1rem 1.4rem",
                  background: "#fff",
                  border: "1px solid #e2ddd4",
                  borderRadius: 12,
                  textDecoration: "none",
                  transition: "background .2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0ebe1")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >
                <span style={{ color: "#1a3828", fontSize: "1rem", fontWeight: 500, flex: 1, minWidth: 0 }}>{ex.title}</span>
                <div style={{ display: "flex", gap: ".4rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {ex.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: ".68rem",
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        background: TAG_COLORS[tag] ?? "#333",
                        color: "#fff",
                        padding: ".2rem .55rem",
                        borderRadius: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", marginTop: "2rem" }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: "1px solid #c8c0b0",
                    background: p === page ? "var(--gold)" : "transparent",
                    color: p === page ? "#000" : "#3d463f",
                    fontWeight: 600, cursor: "pointer", fontSize: ".9rem",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: "3rem", textAlign: "center" }}>
            <BookButton className="btn btn-gold">Book a consultation</BookButton>
          </div>
        </div>
      </section>

      <Footer />
      <style>{`
        @media(max-width:560px){
          .guide-card{flex-direction:column !important;align-items:flex-start !important;gap:.6rem !important;}
          .guide-card>div{justify-content:flex-start !important;}
        }
      `}</style>
    </BookingProvider>
  );
}
