/* eslint-disable @next/next/no-img-element */
import { waLink, SITE, CONSULT_DURATION_MIN, CONSULT_FEE_DISPLAY } from "@/lib/site";
import { BookingProvider, BookButton } from "@/components/site/BookingProvider";
import Nav from "@/components/site/Nav";
import Reveal from "@/components/site/Reveal";
import HomeFlagship from "@/components/site/HomeFlagship";
import Footer from "@/components/site/Footer";

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Home() {
  return (
    <BookingProvider>
      <Reveal />
      <Nav />

      <span id="top"></span>

      {/* HERO – full-bleed editorial */}
      <section className="hero-full">
        <div className="hero-carousel">
          <picture className="hero-bg-slide">
            <source srcSet="/img/hero-banner.avif" type="image/avif" />
            <source srcSet="/img/hero-banner.webp" type="image/webp" />
            <img
              src="/img/hero-banner.jpg"
              data-edit-img="images.heroBg"
              alt="A joyful Jamaican family moving into their new home"
              fetchPriority="high"
              loading="eager"
              decoding="sync"
            />
          </picture>
          <picture className="hero-bg-slide">
            <source srcSet="/img/couple-signing.webp" type="image/webp" />
            <img src="/img/couple-signing.jpg" alt="A couple signing their property documents" loading="lazy" fetchPriority="low" />
          </picture>
          <picture className="hero-bg-slide">
            <source srcSet="/img/people-new-home.webp" type="image/webp" />
            <img src="/img/people-new-home.jpg" alt="A family settling into their new Jamaican home" loading="lazy" fetchPriority="low" />
          </picture>
          <picture className="hero-bg-slide">
            <source srcSet="/img/family-moving-in.webp" type="image/webp" />
            <img src="/img/family-moving-in.jpg" alt="A family moving into their new property" loading="lazy" fetchPriority="low" />
          </picture>
        </div>
        <div className="hero-scrim" aria-hidden="true"></div>
        <div className="hero-full-inner reveal in">
          <p className="hero-firm" data-edit="hero.firm">Ferguson Law</p>
          <span className="eyebrow" data-edit="hero.eyebrow">
            Kingston, Jamaica
          </span>
          <h1>
            Buying or Selling Property in Jamaica?{" "}
            <em>We Handle It All.</em>
          </h1>
          <p className="lead">
            From first question to registered title – Ferguson Law guides
            Jamaican families and the diaspora through every property purchase,
            sale, and transfer.
          </p>
          <div className="hero-cta">
            <a className="btn btn-gold hero-cta-primary" href="/directory/client-login">
              Get started <ArrowIcon />
            </a>
            <BookButton className="btn btn-gold hero-cta-book">
              <span data-edit="hero.ctaPrimary">Book a consultation</span>{" "}
              <ArrowIcon />
            </BookButton>
            <a className="btn btn-light" href="/buyers-guide">
              H.O.M.E.™ Buyers Guide
            </a>
          </div>
          <div className="hero-proof">
            <div className="avatars">
              <img src="/img/couple-keys.webp" data-edit-img="images.heroAvatar1" alt="Client" loading="lazy" />
              <img src="/img/people-new-home.webp" data-edit-img="images.heroAvatar2" alt="Client" loading="lazy" />
              <img src="/img/finance-consult.webp" data-edit-img="images.heroAvatar3" alt="Client" loading="lazy" />
              <img
                src="/img/realtor-banner.jpg"
                data-edit-img="images.heroAvatar4"
                alt="Client"
              />
            </div>
            <div>
              <span className="stars">★★★★★</span>{" "}
              <b>Trusted</b>{" "}by Jamaican families &amp; the diaspora
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust">
        <div className="wrap trust-grid">
          <div className="div">
            <div className="n" data-edit="trust.0.n">10+</div>
            <div className="l" data-edit="trust.0.l">
              Years practising as Attorney-at-Law
            </div>
          </div>
          <div className="div">
            <div className="n" data-edit="trust.1.n">20+</div>
            <div className="l" data-edit="trust.1.l">
              Years in banking &amp; finance
            </div>
          </div>
          <div className="div">
            <div className="n" data-edit="trust.2.n">24/7</div>
            <div className="l" data-edit="trust.2.l">
              Book a consultation, day or night
            </div>
          </div>
          <div>
            <div className="n" data-edit="trust.3.n">Diaspora-friendly</div>
            <div className="l" data-edit="trust.3.l">
              Sign &amp; settle from anywhere in the world
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES / PRACTICE AREAS – the full firm, up front */}
      <section
        className="section"
        id="services"
        style={{
          background: "linear-gradient(180deg,var(--paper),var(--paper-2))",
        }}
      >
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow" data-edit="services.eyebrow">
              Ferguson Law – practice areas
            </span>
            <h2>
              Property closings, contracts and life transitions done with care.
            </h2>
            <p className="lead">
              Real estate is our focus, and we also support businesses, families, creators and athletes with straightforward legal guidance and trusted execution.
            </p>
            <div className="hero-also" style={{justifyContent:"flex-start",marginTop:"1rem"}}>
              <span className="hero-also-label">Also</span>
              {["Corporate", "Family & Estate", "Intellectual Property", "Sports Law"].map((s) => (
                <span className="hero-also-pill" key={s}>{s}</span>
              ))}
            </div>
          </div>
          <div className="serv-grid">
            {/* 1 — Real Estate */}
            <div className="serv reveal">
              <img className="serv-media" src="/img/re-consult.jpg" data-edit-img="images.serviceImg1" alt="A couple outside their new Kingston property" loading="lazy" />
              <div className="num">01</div>
              <h3 data-edit="services.items.1.title">Real Estate &amp; Conveyancing</h3>
              <p data-edit="services.items.1.body">Sales, purchases, titles and transfers – plus the H.O.M.E.™ home-ownership pathway for first-time and diaspora buyers.</p>
            </div>
            {/* 2 — Divorce */}
            <div className="serv reveal">
              <img className="serv-media" src="/img/couple-signing.jpg" data-edit-img="images.serviceImg3" alt="A couple navigating separation" loading="lazy" />
              <div className="num">02</div>
              <h3 data-edit="services.items.3.title">Divorce &amp; Matrimonial</h3>
              <p data-edit="services.items.3.body">Separation, custody, maintenance and settlements handled with discretion and care.</p>
            </div>
            {/* 3 — Family & Estate */}
            <div className="serv reveal">
              <img className="serv-media" src="/img/family-estate.jpg" data-edit-img="images.serviceImg2" alt="A family meeting their attorney about wills and estate planning" loading="lazy" />
              <div className="num">03</div>
              <h3 data-edit="services.items.2.title">Family &amp; Estate</h3>
              <p data-edit="services.items.2.body">Wills, probate, estate planning and family matters handled with discretion and care.</p>
            </div>
            {/* 4 — Sports Law */}
            <div className="serv reveal">
              <img className="serv-media" src="/img/p-track.jpg" data-edit-img="images.serviceImg5" alt="Sports law – contracts and representation for athletes" loading="lazy" />
              <div className="num">04</div>
              <h3 data-edit="services.items.5.title">Sports Law</h3>
              <p data-edit="services.items.5.body">Contracts, image rights and representation for athletes, clubs and sporting bodies.</p>
            </div>
            {/* 5 — Intellectual Property */}
            <div className="serv reveal">
              <img className="serv-media" src="/img/serv-5.jpg" data-edit-img="images.serviceImg4" alt="Intellectual property protection" loading="lazy" />
              <div className="num">05</div>
              <h3 data-edit="services.items.4.title">Intellectual Property</h3>
              <p data-edit="services.items.4.body">Trademarks, copyright and IP protection for creators, brands and businesses.</p>
            </div>
            {/* 6 — Corporate & Commercial */}
            <div className="serv reveal">
              <img className="serv-media" src="/img/owen-corporate-2026.jpg" alt="Owen K. Ferguson in a modern corporate office" loading="lazy" />
              <div className="num">06</div>
              <h3 data-edit="services.items.0.title">Corporate &amp; Commercial</h3>
              <p data-edit="services.items.0.body">Company formation, contracts, compliance and advisory for businesses at home and abroad.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT / MEET THE FOUNDER */}
      <section className="section about" id="about">
        <div className="wrap about-grid">
          <div className="about-photo reveal">
            <img
              src="/img/founder.webp"
              data-edit-img="images.founderPhoto"
              alt="Owen K. Ferguson, JP – Founder &amp; Principal Attorney-at-Law"
            />
            <div className="about-badge">
              <span className="ab-k" data-edit="about.badgeRole">
                Founder &amp; Principal
              </span>
              <span className="ab-n" data-edit="about.badgeName">
                Owen K. Ferguson, JP
              </span>
            </div>
          </div>
          <div className="about-text reveal">
            <span className="eyebrow" data-edit="about.eyebrow">
              About the firm
            </span>
            <h2 data-edit="about.h2">
              A lawyer who understands the <em>money</em>, too.
            </h2>
            <p className="lead" data-edit="about.lead">
              <strong>Owen K. Ferguson, JP</strong> founded the firm on a single
              principle: legal counsel should be honest, practical, and financially
              grounded. He has served Jamaica&apos;s banking and financial sector
              for more than 20 years, and has practised as an Attorney-at-Law for
              over 10.
            </p>
            <p className="about-p" data-edit="about.body2">
              A 2013 graduate of the Norman Manley Law School, Owen holds
              post-graduate qualifications in law and business administration from
              the University of London. That combination lets him guide first-time
              buyers, businesses, investors, and the Jamaican diaspora through
              complex property transactions without the usual legal fog.
            </p>
            <ul className="creds">
              <li>Attorney-at-Law · 10+ years</li>
              <li>20+ years banking &amp; finance</li>
              <li>Norman Manley Law School, 2013</li>
              <li>Post-graduate law &amp; business, University of London</li>
              <li>Jamaican Bar Association</li>
              <li>International Bar Association</li>
              <li>Justice of the Peace</li>
              <li>NLA Conveyancing Course</li>
            </ul>
            <BookButton className="btn btn-gold">
              Book a consultation <ArrowIcon />
            </BookButton>
          </div>
        </div>
      </section>

      {/* PROCESS – how the firm onboards every client */}
      <section className="section proc" id="process">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow" data-edit="process.eyebrow">
              Client onboarding journey
            </span>
            <h2 data-edit="process.h2">
              Four simple steps from first contact to trusted client.
            </h2>
            <p className="lead" data-edit="process.lead">
              We&apos;ve made it as easy as possible to get started – no paperwork maze, no mystery.
            </p>
          </div>
          <div className="proc-steps">
            <div className="pstep reveal">
              <img
                className="pstep-thumb"
                src="/img/p-discover.jpg"
                data-edit-img="images.process1"
                alt="Client booking a consultation"
              />
              <div className="s-n" data-edit="process.steps.0.n">Step 01</div>
              <h3 data-edit="process.steps.0.title">Check Your Readiness</h3>
              <p data-edit="process.steps.0.body">
                Take the free H.O.M.E.™ readiness assessment – know exactly where you stand before spending a dollar.
              </p>
              <a className="tag pstep-link" href={`${SITE.homeApp}readiness`} target="_blank" rel="noopener">
                Take the assessment –
              </a>
            </div>
            <div className="pstep reveal">
              <img
                className="pstep-thumb"
                src="/img/p-verify.jpg"
                data-edit-img="images.process2"
                alt="Find a trusted professional"
              />
              <div className="s-n" data-edit="process.steps.1.n">Step 02</div>
              <h3 data-edit="process.steps.1.title">Find Your Team</h3>
              <p data-edit="process.steps.1.body">
                Browse vetted real estate agents, surveyors, valuators and lenders in the H.O.M.E.™ directory.
              </p>
              <a className="tag pstep-link" href="/directory">
                Find a professional –
              </a>
            </div>
            <div className="pstep reveal">
              <img
                className="pstep-thumb"
                src="/img/p-engage.jpg"
                data-edit-img="images.process3"
                alt="Read the explainers"
              />
              <div className="s-n" data-edit="process.steps.2.n">Step 03</div>
              <h3 data-edit="process.steps.2.title">Understand the Process</h3>
              <p data-edit="process.steps.2.body">
                Read the free property explainers or download the full H.O.M.E.™ Buyers Guide – plain English, no jargon.
              </p>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <a className="tag pstep-link" href="/explainers">
                  Explainers –
                </a>
                <a className="tag pstep-link" href={`${SITE.homeApp}ebook`} target="_blank" rel="noopener">
                  H.O.M.E.™ Buyers Guide –
                </a>
              </div>
            </div>
            <div className="pstep reveal">
              <img
                className="pstep-thumb"
                src="/img/p-track.jpg"
                data-edit-img="images.process4"
                alt="Book a consultation with Ferguson Law"
              />
              <div className="s-n" data-edit="process.steps.3.n">Step 04</div>
              <h3 data-edit="process.steps.3.title">Book Your Consultation</h3>
              <p data-edit="process.steps.3.body">
                When you&apos;re ready, book a {CONSULT_DURATION_MIN}-minute consultation with Ferguson Law – online, anytime.
              </p>
              <BookButton className="tag pstep-link">
                Book now –
              </BookButton>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND FILM (animated logo + principal) */}
      <section className="section brand-film">
        <div className="wrap bf-grid">
          <div className="bf-video reveal">
            <video
              src="/img/ferguson-promo.mp4"
              data-edit-img="images.promoVideo"
              poster="/img/ferguson-promo-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            ></video>
          </div>
          <div className="bf-copy reveal">
            <img
              className="bf-logo"
              src="/img/logo-ferguson.png"
              data-edit-img="images.logo"
              alt="Ferguson Law"
            />
            <span className="eyebrow">One firm, the full practice</span>
            <h2>
              Deep legal expertise – and the <em>banking mind</em> behind it.
            </h2>
            <p>
              From commercial, family and estate matters to conveyancing and
              titles, Ferguson Law pairs legal and banking expertise under one
              trusted name – for Jamaica and the diaspora.
            </p>
            <div className="bf-founder">
              <img
                src="/img/attorney-dark.jpg"
                data-edit-img="images.founderPhotoDark"
                alt="Owen K. Ferguson, JP"
                style={{width:"132px",height:"132px",objectFit:"cover",borderRadius:"15px",objectPosition:"center top"}}
              />
              <div>
                <span className="k">Principal Attorney-at-Law</span>
                <b>Owen K. Ferguson, JP</b>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* H.O.M.E. FLAGSHIP */}
      <HomeFlagship />

      {/* TESTIMONIALS / STORIES – real-estate outcomes */}
      <section
        className="section"
        id="stories"
        style={{
          background: "linear-gradient(180deg,var(--paper-2),var(--paper))",
        }}
      >
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="eyebrow" data-edit="stories.eyebrow">
              In their words
            </span>
            <h2 data-edit="stories.h2">Real Jamaicans. Real ownership.</h2>
            <p
              className="lead"
              style={{ margin: "0 auto" }}
              data-edit="stories.lead"
            >
              The whole point of the work – people who finally feel at home.
            </p>
          </div>
          <div className="test-grid">
            <div className="tcard reveal">
              <div className="stars">★★★★★</div>
              <p className="q" data-edit="stories.items.0.quote">
                I&apos;m in Toronto and thought buying back home would be a
                nightmare. Ferguson Law handled everything – I signed online and
                got my title without one stressful day off work.
              </p>
              <div className="tperson">
                <img
                  src="/img/couple-signing.jpg"
                  data-edit-img="images.avatar1"
                  alt="Marcus R."
                />
                <div>
                  <div className="nm" data-edit="stories.items.0.name">
                    Marcus R.
                  </div>
                  <div className="rl" data-edit="stories.items.0.role">
                    Diaspora buyer · Toronto – St. James
                  </div>
                </div>
              </div>
            </div>
            <div className="tcard reveal">
              <div className="stars">★★★★★</div>
              <p className="q" data-edit="stories.items.1.quote">
                The readiness score told me the truth – I wasn&apos;t ready yet.
                Six months later I was. No other lawyer ever made it that clear or
                that human.
              </p>
              <div className="tperson">
                <img
                  src="/img/step-assess.webp"
                  data-edit-img="images.avatar2"
                  alt="Keisha L."
                />
                <div>
                  <div className="nm" data-edit="stories.items.1.name">
                    Keisha L.
                  </div>
                  <div className="rl" data-edit="stories.items.1.role">
                    First-time buyer · St. Andrew
                  </div>
                </div>
              </div>
            </div>
            <div className="tcard reveal">
              <div className="stars">★★★★★</div>
              <p className="q" data-edit="stories.items.2.quote">
                They understood the money <em>and</em> the law. Closing costs,
                NHT, the contract – explained like a friend would, not a textbook.
                Keys in hand in weeks.
              </p>
              <div className="tperson">
                <img
                  src="/img/family-moving-in.jpg"
                  data-edit-img="images.avatar3"
                  alt="Andre & Shanice"
                />
                <div>
                  <div className="nm" data-edit="stories.items.2.name">
                    Andre &amp; Shanice
                  </div>
                  <div className="rl" data-edit="stories.items.2.role">
                    New homeowners · St. Catherine
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COAST BAND (Jamaica & the diaspora) */}
      <section className="coast-band">
        <img
          className="bg"
          src="/img/jamaica-coast.webp"
          data-edit-img="images.coastBandBg"
          alt="Jamaica's north coast meeting turquoise water"
        />
        <div className="scrim" aria-hidden="true"></div>
        <div className="wrap">
          <span className="eyebrow reveal in" data-edit="coast.eyebrow">
            Jamaica &amp; the world
          </span>
          <h2 className="reveal in" data-edit="coast.h2">
            Rooted in Jamaica. Working for clients <em>everywhere.</em>
          </h2>
          <p className="reveal in" data-edit="coast.body">
            Whether you&apos;re in Kingston or in Brooklyn, Toronto or London,
            Ferguson Law makes it simple to handle your property, business and
            family matters back home – done right, from anywhere.
          </p>
        </div>
      </section>

      {/* HOW TO REACH US */}
      <section className="section reach-us" id="contact">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow" data-edit="contact.eyebrow">How to reach us</span>
            <h2>
              We&apos;re here – <em>choose how you connect.</em>
            </h2>
            <p className="lead">
              Every path leads to a real person. Pick whatever feels right.
            </p>
          </div>
          <div className="reach-grid">
            {/* Book a consultation – FIRST */}
            <div className="reach-card reveal" style={{cursor:"pointer"}}>
              <div className="reach-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <img className="reach-photo" src="/img/reach-consultation.webp" alt="Book a consultation with Ferguson Law" />
              <h4>Book a consultation</h4>
              <p>{CONSULT_DURATION_MIN} minutes with our attorney – real answers for your specific situation.</p>
              <p style={{fontSize:"0.78rem",color:"var(--muted)",marginTop:"0.3rem"}}>In-person meetings by appointment only.</p>
              <BookButton className="btn btn-primary reach-btn">
                <span data-edit="contact.ctaPrimary">Book now</span>
              </BookButton>
            </div>
            {/* Chat live */}
            <a className="reach-card reveal" href="#chat" aria-label="Open live chat">
              <div className="reach-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <img className="reach-photo" src="/img/reach-chat.webp" alt="Chat live with us" />
              <h4>Chat live</h4>
              <p>Talk to our AI assistant right now – available 24/7, answers questions about any matter.</p>
              <span className="btn btn-gold reach-btn">Start a chat</span>
            </a>
            {/* WhatsApp */}
            <a className="reach-card reveal" href={waLink()} target="_blank" rel="noopener">
              <div className="reach-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <img className="reach-photo" src="/img/reach-whatsapp.webp" alt="WhatsApp Ferguson Law" />
              <h4>WhatsApp</h4>
              <p>Send us a message directly – we respond personally during business hours.</p>
              <span className="btn btn-wa reach-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" style={{width:"18px",height:"18px",flexShrink:0}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                {SITE.whatsappDisplay}
              </span>
            </a>
            {/* Email */}
            <a className="reach-card reveal" href={`mailto:${SITE.email}`}>
              <div className="reach-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
              </div>
              <img className="reach-photo" src="/img/reach-email.jpg" alt="Email Ferguson Law" />
              <h4>Email us</h4>
              <p>Send a detailed message and we&apos;ll get back to you – ideal for complex matters and document sharing.</p>
              <span className="btn btn-light reach-btn">{SITE.email}</span>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </BookingProvider>
  );
}

