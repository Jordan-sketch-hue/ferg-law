/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

const NAV_LINKS = [
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/directory", label: "Find a Pro" },
  { href: "/faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
] as const;

const LOGIN_LINKS = [
  { href: "/directory/login", label: "Partner Login" },
  { href: "/directory/client-login", label: "Client Portal" },
] as const;

const HOME_LINKS = [
  { href: SITE.homeApp, label: "H.O.M.E.™ by Ferguson Law", external: true },
  { href: "/buyers-guide", label: "Buyer's Guide", external: false },
  { href: "/explainers", label: "Explainers", external: false },
  { href: "/glossary", label: "Glossary", external: false },
] as const;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
            <span className="nav-divider" aria-hidden="true" />
            {HOME_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener" : undefined}
                className="nav-home-inline"
                onClick={(e) => handleNavClick(e, l.href)}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="nav-right">
            <a className="btn btn-gold nav-get-started" href="/get-started">
              Get started
            </a>
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

      {/* Mobile drawer + overlay */}
      <div
        className={`nav-overlay${menuOpen ? " show" : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
      <nav className={`nav-drawer${menuOpen ? " open" : ""}`}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={(e) => {
              if (l.href.includes("#")) {
                e.preventDefault();
                setMenuOpen(false);
                const id = l.href.split("#")[1];
                setTimeout(() => {
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                }, 320);
              } else {
                closeMenu();
              }
            }}
          >
            {l.label}
          </a>
        ))}
        {LOGIN_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={closeMenu}
            className="drawer-login-link"
          >
            {l.label}
          </a>
        ))}
        {HOME_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target={l.external ? "_blank" : undefined}
            rel={l.external ? "noopener" : undefined}
            onClick={(e) => { closeMenu(); handleNavClick(e, l.href); }}
            className="drawer-home-link"
          >
            {l.label}
          </a>
        ))}
        <div className="drawer-cta">
          <a className="btn btn-gold" href="/get-started" onClick={closeMenu}>
            Get started
          </a>
        </div>
      </nav>

      <style>{`
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

        /* Mobile drawer H.O.M.E. links */
        .drawer-home-link{ display:block; padding:.45rem 0; font-size:1rem; color:var(--gold-deep); text-decoration:none; font-weight:600; border-bottom:1px solid var(--line); }

        /* Desktop portal login links */
        a.nav-login-inline{
          font-size:.78rem; font-weight:600;
          color:var(--fg) !important;
          text-decoration:none;
          opacity:.75;
          transition:opacity .15s;
        }
        a.nav-login-inline:hover{ opacity:1; }

        /* Mobile drawer portal login links */
        .drawer-login-link{ display:block; padding:.45rem 0; font-size:1rem; color:var(--fg); text-decoration:none; font-weight:500; border-bottom:1px solid var(--line); opacity:.8; }

        .nav-links{ gap:1.4rem; flex:1; justify-content:center; }
        .nav-right{ display:flex; align-items:center; gap:12px; flex-shrink:0; margin-left:1rem; }
        .nav-get-started{ font-size:.85rem; padding:.45rem 1.1rem; white-space:nowrap; }
        @media(max-width:1200px){
          .nav-links a, .nav-links .nav-home-inline{ font-size:.78rem; }
          .nav-links{ gap:1rem; }
        }
        @media(max-width:1000px){
          .nav-links a, .nav-links .nav-home-inline{ font-size:.72rem; }
          .nav-links{ gap:.7rem; }
        }
        @media(max-width:480px){
          .nav-get-started{ font-size:.75rem; padding:.4rem .8rem; }
        }
      `}</style>
    </>
  );
}
