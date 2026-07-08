/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import HomeFlagship from "@/components/site/HomeFlagship";

export const metadata: Metadata = {
  title: "H.O.M.E. — look & background options | Ferguson Law",
  robots: { index: false, follow: false },
};

/**
 * Preview-only chooser for Owen. Three directions for the H.O.M.E. identity:
 *   1 · existing gold logo on the H.O.M.E. green
 *   2 · existing gold logo on black
 *   3 · a light & airy treatment (logo recoloured so it reads on a pale field)
 */
export default function OptionsPage() {
  return (
    <>
    <main className="optwrap">
      <h1>H.O.M.E. — pick the look</h1>
      <p className="opt-intro">
        Owen — three directions for the H.O.M.E. identity. <strong>1</strong> and{" "}
        <strong>2</strong> keep your existing gold logo (it&apos;s gold + white,
        so it needs a dark background). <strong>3</strong> is the{" "}
        <em>light &amp; airy</em> feel you described — I recoloured the lockup so
        it reads on a pale, sunlit background. Reply with the number you prefer
        and I&apos;ll roll it across the H.O.M.E. section.
      </p>

      <div className="opt-grid">
        <div className="opt-card">
          <div className="opt-label">1 · Gold logo · H.O.M.E. green</div>
          <div className="opt-stage bg-green">
            <img
              className="opt-logo"
              src="/img/home-gold-stack.png"
              alt="H.O.M.E. by Ferguson Law — Home Ownership Made Easy"
            />
          </div>
        </div>

        <div className="opt-card">
          <div className="opt-label">2 · Gold logo · Black</div>
          <div className="opt-stage bg-black">
            <img
              className="opt-logo"
              src="/img/home-gold-stack.png"
              alt="H.O.M.E. by Ferguson Law — Home Ownership Made Easy"
            />
          </div>
        </div>

        <div className="opt-card">
          <div className="opt-label">3 · Light &amp; airy</div>
          <div className="opt-stage bg-light">
            <div className="hlite" role="img" aria-label="H.O.M.E. by Ferguson Law — Home Ownership Made Easy">
              <div className="hlite-roof" aria-hidden="true"></div>
              <div className="hlite-acr">H.O.M.E.</div>
              <div className="hlite-tag">Home Ownership Made Easy</div>
              <div className="hlite-by">by Ferguson Law</div>
            </div>
          </div>
        </div>
      </div>

      <p className="opt-context-h">
        Option 3 — the whole section, light &amp; airy
        <small>This is how the full H.O.M.E. section looks in the light direction.</small>
      </p>
    </main>

    <Reveal />
    <HomeFlagship variant="light" />

    <main className="optwrap" style={{ paddingTop: 0 }}>
      <Link href="/" className="opt-back">
        ← Back to the full site
      </Link>
    </main>
    </>
  );
}
