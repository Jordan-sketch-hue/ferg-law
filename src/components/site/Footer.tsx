/* eslint-disable @next/next/no-img-element */
import { SITE, waLink } from "@/lib/site";

/**
 * Shared site footer – single source of truth used on every public page
 * (home, guides, faq, ™) so links + branding stay consistent everywhere.
 * Section links are ROOT-RELATIVE (`/#™`) so they work from any sub-route,
 * not just the homepage. `data-edit` keys are preserved so the `?edit=1`
 * content overlay keeps controlling the blurb / contact details site-wide.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <a className="brand" href="/" aria-label="Ferguson Law – home">
              <img
                className="logo-img"
                src="/img/logo-ferguson.png"
                data-edit-img="images.logo"
                alt="Ferguson Law"
              />
            </a>
            <p data-edit="footer.blurb">
              Trusted counsel for individuals, families and businesses – in
              Jamaica and around the world. H.O.M.E.™ by Ferguson Law helps
              buyers and sellers move from readiness to closing with clarity,
              protection and confidence.
            </p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h5>Explore</h5>
              <a href="/#about">About</a>
              <a href="/#services">Services</a>
              <a href="/#process">Process</a>
              <a href="/#home">H.O.M.E.™ by Ferguson Law</a>
              <a href="/buyers-guide#top">H.O.M.E.™ Buyers Guide</a>
              <a href="/explainers">Explainers</a>
              <a href="/glossary">Property Glossary</a>
              <a href="/directory">Find a Pro</a>
              <a href="/#stories">Stories</a>
              <a href="/faq">FAQ</a>
            </div>
            <div className="foot-col">
              <h5>Practice Areas</h5>
              <a href="/#services">Conveyancing</a>
              <a href="/#services">Property Law</a>
              <a href="/#services">Estate Planning</a>
            </div>
            <div className="foot-col">
              <h5>Contact</h5>
              <a
                href={waLink()}
                target="_blank"
                rel="noopener"
                data-edit="footer.whatsapp"
              >
                WhatsApp · {SITE.whatsappDisplay}
              </a>
              <a href={`mailto:${SITE.email}`} data-edit="footer.email">
                Email · {SITE.email}
              </a>
              <p>Jamaica &amp; worldwide</p>
            </div>
          </div>
        </div>
        <div className="foot-bottom">
          <div>
            © <span id="yr">{year}</span> Ferguson Law. All rights reserved ·
            Kingston, Jamaica.
          </div>
        </div>
      </div>
    </footer>
  );
}
