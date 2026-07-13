/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  KIND_LABEL, PARTNER_DISCLAIMER,
  type Partner, type Listing, type Service,
} from "@/lib/partners/constants";
import ListingCards from "./ListingCards";

export const dynamic = "force-dynamic";

export default async function PartnerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = await createClient();

  const { data: partner } = await sb
    .from("fl_partners")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!partner) notFound();
  const p = partner as Partner;

  const [{ data: listings }, { data: services }] = await Promise.all([
    sb.from("fl_partner_listings").select("*").eq("partner_id", p.id).eq("status", "published").order("created_at", { ascending: false }),
    sb.from("fl_partner_services").select("*").eq("partner_id", p.id).eq("status", "published").order("created_at", { ascending: false }),
  ]);

  const tel = p.whatsapp?.replace(/[^0-9]/g, "") || p.phone?.replace(/[^0-9]/g, "");

  return (
    <div className="dir-wrap">
      <div className="profile-head">
        {p.logo_url ? (
          <img className="profile-logo" src={p.logo_url} alt="" />
        ) : (
          <div className="profile-logo" />
        )}
        <div>
          <div className="kind" style={{ color: "var(--gold-deep)", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase" }}>
            {KIND_LABEL[p.kind]}
          </div>
          <h1>{p.business_name}</h1>
          <div className="meta" style={{ color: "var(--muted)" }}>
            {(p.parishes ?? []).join(" · ") || "Jamaica"}
          </div>
          {p.kind === "realtor" && p.reb_number ? (
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", color: "var(--gold-deep)", border: "1px solid var(--gold-deep)", borderRadius: 999, padding: "3px 10px" }}>
              ✓ REB {p.reb_number}
            </div>
          ) : null}
        </div>
      </div>

      {p.bio && <p style={{ maxWidth: 680, color: "var(--text)", lineHeight: 1.6, margin: "8px 0 18px" }}>{p.bio}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        {tel && (
          <a className="btn btn-gold" href={`https://wa.me/${tel}`} target="_blank" rel="noopener">WhatsApp</a>
        )}
        {p.phone && <a className="btn btn-ghost" href={`tel:${p.phone}`}>Call</a>}
        {p.email && <a className="btn btn-ghost" href={`mailto:${p.email}`}>Email</a>}
        {p.website && (
          <a className="btn btn-ghost" href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener">
            Website
          </a>
        )}
      </div>

      {p.kind === "realtor" ? (
        <section style={{ marginTop: 26 }}>
          <h2 style={{ fontFamily: "var(--serif)", color: "var(--ink)", fontSize: 24, marginBottom: 14 }}>Listings</h2>
          {(listings as Listing[] | null)?.length ? (
            <ListingCards listings={listings as Listing[]} />
          ) : (
            <p style={{ color: "var(--muted)" }}>No listings published yet.</p>
          )}
        </section>
      ) : (
        <section style={{ marginTop: 26 }}>
          <h2 style={{ fontFamily: "var(--serif)", color: "var(--ink)", fontSize: 24, marginBottom: 14 }}>Services &amp; fees</h2>
          {(services as Service[] | null)?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {(services as Service[]).map((s) => (
                <div className="svc-row" key={s.id}>
                  <div>
                    <strong style={{ color: "var(--ink)" }}>{s.name}</strong>
                    {s.description && <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3 }}>{s.description}</div>}
                  </div>
                  <div className="fee">{s.fee_text || "On request"}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted)" }}>No services published yet.</p>
          )}
        </section>
      )}

      <div className="disclaimer">
        <strong>Please note:</strong> {PARTNER_DISCLAIMER}
      </div>
    </div>
  );
}
