"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FAQ_GROUPS } from "@/lib/faq";

interface Hit {
  title: string;
  desc: string;
  href: string;
  tag: string;
}

const PAGES: Hit[] = [
  { title: "Home", desc: "Ferguson Law - Jamaica property lawyer & conveyancing", href: "/", tag: "Page" },
  { title: "Book a Consultation", desc: "Schedule a 20-minute consultation with our attorney", href: "/booking", tag: "Page" },
  { title: "Get Started", desc: "Find the right service for buyers, sellers, diaspora, business & more", href: "/get-started", tag: "Page" },
  { title: "H.O.M.E. Buyers Guide", desc: "Step-by-step guide to buying property in Jamaica", href: "/buyers-guide", tag: "Guide" },
  { title: "Explainers", desc: "Plain-language articles on Jamaican property law", href: "/explainers", tag: "Page" },
  { title: "Glossary", desc: "Key property and legal terms explained", href: "/glossary", tag: "Page" },
  { title: "FAQ", desc: "Common questions about our services, fees and consultations", href: "/faq", tag: "Page" },
  { title: "Find a Professional", desc: "Vetted realtors, valuators and lenders in Jamaica", href: "/directory", tag: "Page" },
  { title: "Real Estate & Conveyancing", desc: "Property purchases, sales, titles and transfers", href: "/get-started#buyer", tag: "Service" },
  { title: "Divorce & Matrimonial", desc: "Separation, custody, maintenance and settlements", href: "/get-started#divorcing", tag: "Service" },
  { title: "Family & Estate", desc: "Wills, probate and estate planning", href: "/get-started#estate", tag: "Service" },
  { title: "Sports Law", desc: "Contracts, image rights and representation for athletes", href: "/get-started#athlete", tag: "Service" },
  { title: "Intellectual Property", desc: "Trademarks, copyright and IP protection", href: "/get-started#business", tag: "Service" },
  { title: "Corporate & Commercial", desc: "Company formation, contracts and compliance", href: "/get-started#business", tag: "Service" },
  { title: "Overseas / Diaspora Buyers", desc: "Buy Jamaican property from Canada, UK, USA - handled remotely", href: "/get-started#buyer", tag: "Service" },
];

// Build search index from FAQ
const FAQ_HITS: Hit[] = FAQ_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    title: item.q,
    desc: item.a.split("\n\n")[0].slice(0, 120),
    href: `/faq#${g.id}`,
    tag: "FAQ",
  }))
);

const ALL: Hit[] = [...PAGES, ...FAQ_HITS];

function score(hit: Hit, q: string): number {
  const lower = q.toLowerCase();
  const title = hit.title.toLowerCase();
  const desc = hit.desc.toLowerCase();
  if (title === lower) return 100;
  if (title.startsWith(lower)) return 80;
  if (title.includes(lower)) return 60;
  if (desc.includes(lower)) return 30;
  const words = lower.split(/\s+/).filter(Boolean);
  const matched = words.filter((w) => title.includes(w) || desc.includes(w));
  return matched.length ? (matched.length / words.length) * 20 : 0;
}

const TAG_COLORS: Record<string, string> = {
  Page: "#6b6b6b",
  Guide: "#2d6a2d",
  Service: "#7a5c00",
  FAQ: "#1a4a7a",
};

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const hits = query.trim()
    ? ALL.map((h) => ({ hit: h, s: score(h, query) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
        .map((x) => x.hit)
    : PAGES.slice(0, 6);

  const openModal = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIdx(0);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Ctrl+K or / to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => (v ? false : true));
        if (!open) { setQuery(""); setActiveIdx(0); }
      }
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Arrow key navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && hits[activeIdx]) {
      window.location.href = hits[activeIdx].href;
      closeModal();
    }
  };

  // Expose open function via custom event
  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener("fl:open-search", handler);
    return () => window.removeEventListener("fl:open-search", handler);
  }, [openModal]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "clamp(60px, 12vh, 120px)",
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div
        style={{
          background: "#faf8f4", borderRadius: 14,
          width: "min(600px, 92vw)", boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}
        role="dialog"
        aria-label="Site search"
        aria-modal="true"
      >
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #ede8df" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search Ferguson Law..."
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: "1rem", color: "#1a1a1a", fontFamily: "inherit",
            }}
            aria-label="Search"
            autoComplete="off"
          />
          <kbd style={{ fontSize: ".72rem", color: "#aaa", border: "1px solid #ddd", borderRadius: 5, padding: "2px 7px", background: "#fff", lineHeight: 1.6 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", maxHeight: 380 }}>
          {hits.length === 0 ? (
            <p style={{ padding: "24px 20px", color: "#999", fontSize: ".9rem", margin: 0 }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
              {hits.map((h, i) => (
                <li key={h.href + h.title}>
                  <a
                    href={h.href}
                    onClick={closeModal}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 18px", textDecoration: "none",
                      background: i === activeIdx ? "#f0ece4" : "transparent",
                      transition: "background .1s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: ".9rem", color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {h.title}
                      </div>
                      {h.desc && (
                        <div style={{ fontSize: ".78rem", color: "#666", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {h.desc}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: ".7rem", fontWeight: 700, letterSpacing: ".04em",
                      color: TAG_COLORS[h.tag] ?? "#666",
                      border: `1px solid ${TAG_COLORS[h.tag] ?? "#ccc"}`,
                      borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0,
                    }}>{h.tag}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: "8px 18px", borderTop: "1px solid #ede8df", fontSize: ".72rem", color: "#aaa", display: "flex", gap: 16 }}>
          <span><kbd style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1px 5px", background: "#f5f5f5" }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1px 5px", background: "#f5f5f5" }}>Enter</kbd> open</span>
          <span><kbd style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1px 5px", background: "#f5f5f5" }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
