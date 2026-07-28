"use client";

import { useState } from "react";
import Link from "next/link";
import { KIND_LABEL, KIND_PLURAL, PARTNER_KINDS, type PartnerKind as Kind } from "@/lib/partners/constants";

interface PartnerRow {
  id: string;
  kind: Kind;
  business_name: string;
  parishes: string[] | null;
  bio: string | null;
  logo_url: string | null;
  work_photos: { type: string; url: string }[] | null;
  slug: string | null;
  featured: boolean;
}

interface Props {
  rows: PartnerRow[];
  listCount: Record<string, number>;
  firstImg: Record<string, string>;
  svcCount: Record<string, number>;
  activeKind: Kind | null;
}

export default function DirectoryClient({ rows, listCount, firstImg, svcCount, activeKind }: Props) {
  const [query, setQuery] = useState("");

  const filtered = rows.filter((p) => {
    if (activeKind && p.kind !== activeKind) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.business_name.toLowerCase().includes(q) ||
      (p.parishes ?? []).some((pa) => pa.toLowerCase().includes(q)) ||
      (p.bio ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="kind-row">
        <Link className="kind-pill" data-active={!activeKind} href="/directory">
          All
        </Link>
        {PARTNER_KINDS.map(({ value }) => (
          <Link key={value} className="kind-pill" data-active={activeKind === value} href={`/directory?kind=${value}`}>
            {KIND_PLURAL[value]}
          </Link>
        ))}
      </div>

      <div style={{ maxWidth: 480, margin: "0 0 1.25rem" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or parish…"
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            border: "1px solid rgba(18,16,12,.15)",
            borderRadius: 999,
            fontSize: "0.9rem",
            background: "#fff",
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="dir-empty">
          {query ? (
            <p>No professionals match &ldquo;{query}&rdquo;.</p>
          ) : (
            <>
              <h3>No professionals listed yet</h3>
              <p>
                Be the first —{" "}
                <Link href="/directory/join" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  list your business
                </Link>{" "}
                here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="dir-grid">
          {filtered.map((p) => {
            const firstWorkPhoto = (p.work_photos ?? []).find((m) => m.type === "image")?.url ?? "";
            const thumb = firstImg[p.id] || p.logo_url || firstWorkPhoto;
            const n = p.kind === "realtor" ? listCount[p.id] ?? 0 : svcCount[p.id] ?? 0;
            const noun =
              p.kind === "realtor"
                ? `${n} listing${n === 1 ? "" : "s"}`
                : `${n} service${n === 1 ? "" : "s"}`;
            return (
              <Link key={p.id} className="pcard" href={`/directory/${p.slug || p.id}`}>
                <div className="thumb" style={thumb ? { backgroundImage: `url("${thumb}")` } : undefined} />
                <div className="body">
                  <div className="kind">{KIND_LABEL[p.kind]}</div>
                  <h3>{p.business_name}</h3>
                  <div className="meta">{(p.parishes ?? []).slice(0, 3).join(" · ") || "Jamaica"}</div>
                  <div className="count">{noun}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
