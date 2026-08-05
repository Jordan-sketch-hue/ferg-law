import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PARTNER_KINDS, type PartnerKind as Kind } from "@/lib/partners/constants";
import DirectoryClient from "./DirectoryClient";

export const dynamic = "force-dynamic";

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

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const validKinds = PARTNER_KINDS.map((k) => k.value);
  const active = validKinds.includes(kind as Kind) ? (kind as Kind) : null;

  const sb = await createClient();

  const [{ data: partners }, { data: listings }, { data: services }] = await Promise.all([
    sb
      .from("fl_partners")
      .select("id,kind,business_name,parishes,bio,logo_url,work_photos,slug,featured")
      .eq("status", "approved")
      .order("featured", { ascending: false })
      .order("business_name", { ascending: true }),
    sb.from("fl_partner_listings").select("partner_id,media").eq("status", "published"),
    sb.from("fl_partner_services").select("partner_id").eq("status", "published"),
  ]);

  const rows = (partners ?? []) as PartnerRow[];

  const listCount: Record<string, number> = {};
  const firstImg: Record<string, string> = {};
  for (const l of (listings ?? []) as { partner_id: string; media: { type: string; url: string }[] }[]) {
    listCount[l.partner_id] = (listCount[l.partner_id] ?? 0) + 1;
    if (!firstImg[l.partner_id]) {
      const img = (l.media ?? []).find((m) => m.type === "image");
      if (img) firstImg[l.partner_id] = img.url;
    }
  }
  const svcCount: Record<string, number> = {};
  for (const s of (services ?? []) as { partner_id: string }[]) {
    svcCount[s.partner_id] = (svcCount[s.partner_id] ?? 0) + 1;
  }

  return (
    <div className="dir-wrap">
      <section className="dir-hero">
        <div className="eyebrow">H.O.M.E.® by Ferguson Law · Find a Professional</div>
        <h1>Trusted real estate agents, surveyors, valuators &amp; bankers — in one place.</h1>
        <p>
          Browse vetted Jamaican property professionals listed with Ferguson Law. Real estate agents showcase listings; bankers, valuators and land surveyors publish their services and fees.
        </p>
        <div className="cta-row">
          <Link className="btn btn-gold" href="/directory/join">
            List your business
          </Link>
          <Link className="btn btn-ghost" href="/directory/login">
            Partner login
          </Link>
        </div>
      </section>

      <div id="browse">
        <DirectoryClient
          rows={rows}
          listCount={listCount}
          firstImg={firstImg}
          svcCount={svcCount}
          activeKind={active}
        />
      </div>
    </div>
  );
}
