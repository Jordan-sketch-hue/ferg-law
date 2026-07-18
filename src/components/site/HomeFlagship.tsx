/* eslint-disable @next/next/no-img-element */
import { SITE } from "@/lib/site";
import { HomeBadge, HomeBadgeCSS } from "@/components/site/HomeBadge";

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * H.O.M.E. flagship section.
 *  - variant="green" (default) → the premium dark-green field + gold logo (live site).
 *  - variant="light"           → Owen's "light & airy" direction: pale, sunlit field
 *    with the recoloured CSS lockup (the gold PNG is gold+white and can't go light).
 */
export default function HomeFlagship({
  variant = "green",
}: {
  variant?: "green" | "light";
}) {
  const light = variant === "light";
  return (
    <section className={`section home-flagship${light ? " hf-light" : ""}`} id="home" style={{ position: "relative" }}>
      {/* Ebook cover — pinned to top-right of section */}
      <a href="/buyers-guide" aria-label="Read the H.O.M.E.™ Buyers Guide" style={{ position: "absolute", top: "5rem", right: "6rem", zIndex: 2, display: "block" }} className="hf-ebook-cover">
        <img
          src="/img/home-ebook-cover.jpg"
          alt="H.O.M.E.™ Buyers Guide — Ferguson Law"
          style={{ width: 260, borderRadius: 18, boxShadow: "0 28px 70px rgba(0,0,0,.65)", display: "block" }}
        />
      </a>
      <style>{`.hf-ebook-cover:hover img{transform:scale(1.03);transition:transform .2s ease}.hf-ebook-cover img{transition:transform .2s ease}@media(max-width:900px){.hf-ebook-cover{display:none!important}}`}</style>
      <div className="wrap">
        <div className="hf-head reveal in">
          <div className="hf-flags">
            {([["jm","Jamaica"],["us","USA"],["gb","UK"],["ca","Canada"]] as [string,string][]).map(([code,name]) => (
              <img key={code} src={`https://flagcdn.com/20x15/${code}.png`} alt={name} style={{height:15,width:"auto",borderRadius:2,display:"inline-block"}} />
            ))}
            <span className="hf-flags-label">For Jamaica &amp; the diaspora</span>
          </div>

          {light ? (
            <div
              className="hlite hlite-lg"
              role="img"
              aria-label="H.O.M.E.™ by Ferguson Law — Home Ownership Made Easy"
            >
              <div className="hlite-roof" aria-hidden="true"></div>
              <div className="hlite-acr">H.O.M.E.</div>
              <div className="hlite-tag">Home Ownership Made Easy</div>
              <div className="hlite-by">by Ferguson Law</div>
            </div>
          ) : (
            <span className="home-logo-tile">
              <img
                className="home-logo"
                src="/img/home-gold-stack.png"
                data-edit-img="images.homeLogo"
                alt="H.O.M.E.™ by Ferguson Law — Home Ownership Made Easy"
              />
            </span>
          )}

          <p className="sub" data-edit="home.sub">
            <strong>H.O.M.E.™ by Ferguson Law</strong> — the home-ownership platform built for Jamaicans at home and abroad. Assess your readiness, find trusted professionals, and complete your purchase with Ferguson Law handling the legal work. <strong>Diaspora-friendly</strong> — sign and settle from anywhere.
          </p>
          <div className="hf-actions">
            <HomeBadge href={SITE.homeApp} external dark={!light}>
              Visit H.O.M.E.™ by Ferguson Law
            </HomeBadge>
            <HomeBadge href={`${SITE.homeApp}readiness`} external dark={!light}>
              Take the readiness assessment
            </HomeBadge>
            <HomeBadge href="/buyers-guide" dark={!light}>
              H.O.M.E.™ Buyers Guide
            </HomeBadge>
          </div>
          <style>{HomeBadgeCSS}</style>
        </div>

        <style>{`.hf-ebook-cover{display:block;flex-shrink:0}.hf-ebook-cover:hover img{transform:scale(1.03);transition:transform .2s ease}.hf-ebook-cover img{transition:transform .2s ease}@media(max-width:640px){.hf-ebook-cover{display:none}}@media(max-width:768px){.home-grid .steps-card{display:none}.home-grid .home-photo{display:none}}`}</style>

        <div className="home-grid">
          <div className="home-photo reveal">
            <img
              src="/img/home-keys.jpg"
              data-edit-img="images.homePhoto"
              alt="A Jamaican family receiving the keys to their new home"
            />
            <div className="cap">
              <span className="k">The outcome we deliver</span>
              <h4>From first question to keys in hand.</h4>
            </div>
          </div>
          <div className="steps-card reveal">
            <a className="hstep hstep-link" href={`${SITE.homeApp}readiness`} target="_blank" rel="noopener">
              <div className="n" data-edit="home.steps.0.n">Step 01</div>
              <h4 data-edit="home.steps.0.title">Assess</h4>
              <p data-edit="home.steps.0.body">
                Get an honest 0–100 readiness score in three minutes.
              </p>
              <span className="hstep-cta">Take the assessment →</span>
            </a>
            <a className="hstep hstep-link" href="/directory">
              <div className="n" data-edit="home.steps.1.n">Step 02</div>
              <h4 data-edit="home.steps.1.title">Find Your Professionals</h4>
              <p data-edit="home.steps.1.body">
                Connect with vetted real estate agents, valuators and lenders.
              </p>
              <span className="hstep-cta">Find a professional →</span>
            </a>
            <a className="hstep hstep-link" href={`${SITE.homeApp}mortgage-calculator`} target="_blank" rel="noopener">
              <div className="n" data-edit="home.steps.2.n">Step 03</div>
              <h4 data-edit="home.steps.2.title">Finance</h4>
              <p data-edit="home.steps.2.body">
                How much is my monthly payment? Use the mortgage calculator.
              </p>
              <span className="hstep-cta">Open the calculator →</span>
            </a>
            <a className="hstep hstep-link" href="/buyers-guide">
              <div className="n" data-edit="home.steps.3.n">Step 04</div>
              <h4 data-edit="home.steps.3.title">Close</h4>
              <p data-edit="home.steps.3.body">
                Ferguson Law handles conveyancing to a registered title in your name.
              </p>
              <span className="hstep-cta">Read the Buyers Guide →</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
