/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

const NAV_LINKS = [
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/directory", label: "Find a Pro" },
  { href: "/#contact", label: "Contact" },
] as const;

const LOGIN_LINKS = [
  { href: "/directory/login", label: "Partner Login" },
  { href: "/directory/client-login", label: "Client Portal" },
] as const;

const HOME_LINK = { href: SITE.homeApp, label: "H.O.M.E. by Ferguson Law", external: true };

const RESOURCE_LINKS = [
  { href: "/buyers-guide", label: "Buyer's Guide" },
  { href: "/explainers", label: "Explainers" },
  { href: "/cost-estimator", label: "Cost Estimator®" },
  { href: "/glossary", label: "Glossary" },
  { href: "/faq", label: "FAQ" },
] as const;

const PenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
);

const CalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);


export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("http") && pathname === href) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (!resourcesOpen && !loginOpen) return;
    const handler = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [resourcesOpen, loginOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}`} id="nav">
        <div className="wrap nav-inner">
          <div className="nav-left">
            <a className="brand" href="/" aria-label="Ferguson Law home">
              <img className="logo-img" src="/img/logo-ferguson.png" alt="Ferguson Law" />
            </a>
          </div>

          {/* Desktop inline links */}
          <nav className="nav-links" id="navLinks">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
            {/* Resources dropdown */}
            <div className="nav-resources-wrap" ref={resourcesRef}>
              <button
                className="nav-resources-btn"
                onClick={() => setResourcesOpen((v) => !v)}
                aria-expanded={resourcesOpen}
              >
                Resources <span className="nav-caret" aria-hidden="true">▾</span>
              </button>
              {resourcesOpen && (
                <div className="nav-resources-dropdown">
                  {RESOURCE_LINKS.map((l) => (
                    <a key={l.href} href={l.href} onClick={() => setResourcesOpen(false)}>
                      {l.label.includes("®")
                        ? <>{l.label.replace("®", "")}<sup style={{fontSize:"0.55em",verticalAlign:"super",lineHeight:0}}>®</sup></>
                        : l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <span className="nav-divider" aria-hidden="true" />
            <a
              href={HOME_LINK.href}
              target="_blank"
              rel="noopener"
              className="nav-home-inline"
            >
              H.O.M.E. by Ferguson Law<sup style={{fontSize:"0.55em",verticalAlign:"super",lineHeight:0}}>®</sup>
            </a>
          </nav>

          <div className="nav-right">
            {/* Utility — search first */}
            <button
              className="nav-search-btn nav-search-desktop"
              aria-label="Search"
              onClick={() => window.dispatchEvent(new CustomEvent("fl:open-search"))}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            {/* Log in */}
            <div className="nav-login-wrap" ref={loginRef}>
              <button
                className="nav-login-btn"
                onClick={() => setLoginOpen((v) => !v)}
                aria-expanded={loginOpen}
              >
                Log in <span className="nav-caret" aria-hidden="true">▾</span>
              </button>
              {loginOpen && (
                <div className="nav-resources-dropdown nav-login-dropdown">
                  {LOGIN_LINKS.map((l) => (
                    <a key={l.href} href={l.href} onClick={() => setLoginOpen(false)}>{l.label}</a>
                  ))}
                </div>
              )}
            </div>
            {/* Book here — desktop */}
            <a
              href="/booking"
              className="btn btn-gold nav-consult-btn"
              onClick={(e) => handleNavClick(e, "/booking")}
            >
              <CalIcon /><span className="btn-label">Book here</span>
            </a>
            {/* Book here — mobile only */}
            <a
              href="/booking"
              className="btn btn-gold nav-consult-mobile"
              onClick={(e) => handleNavClick(e, "/booking")}
            >
              <CalIcon /><span className="btn-label">Book here</span>
            </a>
            {/* Get started */}
            <a className="btn btn-gold nav-get-started" href="/get-started">
              <PenIcon /><span className="btn-label">Get started</span>
            </a>
            {/* Hamburger */}
            <button
              className={`menu-btn${menuOpen ? " active" : ""}`}
              id="menuBtn"
              aria-label="Menu"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer + overlay — wrapper clips fixed drawer to viewport so iOS doesn't zoom */}
      <div className={`nav-drawer-clip${menuOpen ? " active" : ""}`} aria-hidden="true">
        <div
          className={`nav-overlay${menuOpen ? " show" : ""}`}
          onClick={closeMenu}
        />
        <nav className={`nav-drawer${menuOpen ? " open" : ""}`}>
          {/* Main nav */}
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}
              onClick={(e) => {
                if (l.href.includes("#")) {
                  e.preventDefault();
                  setMenuOpen(false);
                  const id = l.href.split("#")[1];
                  setTimeout(() => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }, 320);
                } else { closeMenu(); }
              }}
            >{l.label}</a>
          ))}

          {/* Portals */}
          <div className="drawer-section-label">Portals</div>
          {LOGIN_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={closeMenu} className="drawer-sub-link">{l.label}</a>
          ))}
          <a href={HOME_LINK.href} target="_blank" rel="noopener" onClick={closeMenu} className="drawer-sub-link drawer-home-pill">
            H.O.M.E. by Ferguson Law<sup style={{fontSize:"0.55em",verticalAlign:"super",lineHeight:0}}>®</sup>
          </a>

          {/* Resources */}
          <div className="drawer-section-label">Resources</div>
          {RESOURCE_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={closeMenu}
              className={`drawer-sub-link${l.href === "/cost-estimator" ? " drawer-featured-link" : ""}`}>
              {l.label.includes("®")
                ? <>{l.label.replace("®", "")}<sup style={{fontSize:"0.55em",verticalAlign:"super",lineHeight:0}}>®</sup></>
                : l.label}
              {l.href === "/cost-estimator" && <span className="drawer-badge">Tool</span>}
            </a>
          ))}

          {/* Search */}
          <button className="drawer-search-btn"
            onClick={() => { closeMenu(); window.dispatchEvent(new CustomEvent("fl:open-search")); }}
            aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Search
          </button>

          <div className="drawer-cta">
            <a className="btn btn-ghost drawer-consult-btn" href="/booking" onClick={closeMenu}>Book here</a>
            <a className="btn btn-gold" href="/get-started" onClick={closeMenu}><PenIcon /> Get started</a>
          </div>
        </nav>
      </div>

      <style>{`
        /* Drawer clip wrapper — position:fixed; overflow:hidden clips drawer to viewport
           so iOS Safari doesn't detect off-screen translateX and zoom out the page */
        .nav-drawer-clip{
          position:fixed; inset:0; pointer-events:none;
          overflow:hidden; z-index:9500;
        }
        .nav-drawer-clip.active{ pointer-events:auto; }
        .nav-drawer-clip .nav-overlay{ position:absolute; }
        .nav-drawer-clip .nav-drawer{ position:absolute; }

        /* H.O.M.E. inline nav links */
        .nav-divider{
          display:inline-block; width:1px; height:14px;
          background:var(--line); margin:0 .1rem; vertical-align:middle; opacity:.6;
        }
        a.nav-home-inline{
          font-size:.78rem; font-weight:600;
          color:var(--gold-deep) !important;
          text-decoration:none;
          transition:opacity .15s;
        }
        a.nav-home-inline:hover{ opacity:.72; }

        /* Drawer section label — sits between links, no extra border */
        .drawer-section-label{
          font-size:.65rem; font-weight:700; letter-spacing:.13em; text-transform:uppercase;
          color:var(--gold-deep,#8a6d1f); padding:14px 28px 6px;
          background:rgba(201,168,106,.06);
        }

        /* Sub-links inherit .nav-drawer a border — just tweak padding + size */
        .nav-drawer a.drawer-sub-link{
          font-size:.9rem; padding:13px 28px; display:flex;
          align-items:center; justify-content:space-between;
        }

        /* H.O.M.E. gold tint */
        .nav-drawer a.drawer-home-pill{ color:var(--gold-deep,#8a6d1f) !important; font-weight:600 !important; }

        /* Cost Estimator — slightly bolder */
        .nav-drawer a.drawer-featured-link{ font-weight:700 !important; }

        /* "Tool" badge */
        .drawer-badge{
          font-size:.6rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
          background:rgba(201,168,106,.15); color:var(--gold-deep,#8a6d1f);
          border:1px solid rgba(201,168,106,.35); border-radius:999px;
          padding:2px 7px; flex-shrink:0;
        }

        /* Desktop portal login links */
        a.nav-login-inline{
          font-size:.78rem; font-weight:600;
          color:var(--fg) !important;
          text-decoration:none;
          opacity:.75;
          transition:opacity .15s;
        }
        a.nav-login-inline:hover{ opacity:1; }

        /* Resources dropdown */
        .nav-resources-wrap{ position:relative; display:inline-flex; align-items:center; }
        .nav-resources-btn{
          background:none; border:none; cursor:pointer; padding:0;
          font:inherit; font-size:.85rem; font-weight:500;
          color:var(--fg); display:flex; align-items:center; gap:.25rem;
          transition:opacity .15s;
        }
        .nav-resources-btn:hover{ opacity:.7; }
        .nav-caret{ font-size:.65rem; line-height:1; }
        .nav-resources-dropdown{
          position:absolute; top:calc(100% + 10px); left:50%; transform:translateX(-50%);
          background:var(--surface,#fff); border:1px solid var(--line);
          border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.12);
          min-width:160px; overflow:hidden; z-index:200;
        }
        .nav-resources-dropdown a{
          display:block; padding:.6rem 1rem; font-size:.85rem;
          color:var(--fg); text-decoration:none;
          transition:background .12s;
        }
        .nav-resources-dropdown a:hover{ background:var(--surface-alt,#f5f5f5); }

        .drawer-consult-btn{ width:100%; justify-content:center; margin-bottom:.5rem; border-color:var(--ink); color:var(--ink); }

        .nav-links{ gap:1.4rem; flex:1; justify-content:center; }
        .nav-right{ display:flex; align-items:center; gap:12px; flex-shrink:0; margin-left:1rem; }
        .nav-get-started{ display:inline-flex; align-items:center; gap:6px; font-size:.85rem; padding:.45rem 1.1rem; white-space:nowrap; }

        /* Log in — prominent, beside Get started (Owen's ask) */
        .nav-login-wrap{ position:relative; }
        .nav-login-btn{
          background:none; cursor:pointer; font:inherit;
          font-size:.85rem; font-weight:600; white-space:nowrap;
          color:var(--gold-deep,#8a6d1f); border:1.5px solid var(--gold-deep,#8a6d1f);
          border-radius:999px; padding:.42rem 1rem;
          display:flex; align-items:center; gap:.3rem;
          transition:background .15s, color .15s;
        }
        .nav-login-btn:hover{ background:var(--gold-deep,#8a6d1f); color:#fff; }
        .nav-login-dropdown{ left:auto; right:0; transform:none; }
        .nav-search-btn{
          background:none; border:none; cursor:pointer; padding:6px;
          color:#5a5a5a; display:flex; align-items:center; border-radius:8px;
          transition:background .15s, color .15s;
        }
        .nav-search-btn:hover{ background:#f0ece4; color:#1a1a1a; }
        @media(max-width:760px){ .nav-search-desktop{ display:none !important; } }

        /* Search row inside mobile drawer */
        .drawer-search-btn{
          display:flex; align-items:center; gap:.6rem;
          width:100%; background:none; border:none; border-bottom:1px solid var(--line);
          padding:.5rem 0; font:inherit; font-size:1rem; font-weight:500;
          color:var(--fg); cursor:pointer; text-align:left;
        }
        .drawer-search-btn:hover{ color:var(--gold-deep); }

        /* Consultation button — desktop nav-right */
        .nav-consult-btn{
          font-size:.82rem; padding:.42rem 1rem; white-space:nowrap;
          display:inline-flex; align-items:center; gap:6px;
        }
        @media(max-width:1040px){ .nav-consult-btn{ display:none; } }

        /* Mobile-only Consultation button (shown between 601px–1040px only) */
        .nav-consult-mobile{ display:none; }
        @media(min-width:601px) and (max-width:1040px){
          .nav-consult-mobile{
            display:inline-flex !important; align-items:center; gap:6px;
            font-size:.85rem; padding:.45rem 1.1rem; white-space:nowrap;
          }
        }
        /* ≤600px — hide Book here from nav bar entirely; it lives in the drawer */
        @media(max-width:600px){
          .nav-consult-mobile{ display:none !important; }
          .nav-get-started{ font-size:.85rem !important; padding:.45rem 1.1rem !important; }
          .nav-right{ gap:10px !important; }
        }

        @media(max-width:760px){ .nav-login-wrap{ display:none; } }
        @media(max-width:1200px){
          .nav-links a, .nav-links .nav-home-inline{ font-size:.78rem; }
          .nav-links{ gap:1rem; }
        }
        @media(max-width:1000px){
          .nav-links a, .nav-links .nav-home-inline{ font-size:.72rem; }
          .nav-links{ gap:.7rem; }
        }
      `}</style>
    </>
  );
}
