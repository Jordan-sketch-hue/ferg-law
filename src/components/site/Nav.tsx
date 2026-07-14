/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE, waLink } from "@/lib/site";
import { BookButton } from "@/components/site/BookingProvider";

const NAV_LINKS = [
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/directory", label: "Find a Pro" },
  { href: "/faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
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

          <div className="nav-cta">
            <a
              href="/directory/client-login"
              className="btn btn-ghost nav-portal"
              style={{ fontSize: ".78rem", fontWeight: 600 }}
            >
              Client portal
            </a>
            <a
              href="/directory/login"
              className="btn btn-ghost nav-portal"
              style={{ fontSize: ".78rem", fontWeight: 600 }}
            >
              Partner login
            </a>
            <a
              className="btn btn-wa nav-wa"
              href={waLink()}
              target="_blank"
              rel="noopener"
              aria-label="Chat on WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A2.8 2.8 0 0 0 6.7 9c0 1.7 1.2 3.3 1.4 3.5s2.4 3.6 5.7 5c2 .9 2.8.9 3.8.8.6-.1 1.9-.8 2.1-1.5s.3-1.4.2-1.5-.3-.2-.5-.3Z" />
              </svg>
              WhatsApp
            </a>
            <BookButton className="btn btn-gold nav-book">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="nav-book-full">Book a consultation</span>
              <span className="nav-book-short">Book</span>
            </BookButton>
          </div>

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
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <a href="/directory/client-login" className="btn btn-ghost" style={{ flex: 1, textAlign: "center", fontSize: ".85rem" }} onClick={closeMenu}>
            Client portal
          </a>
          <a href="/directory/login" className="btn btn-ghost" style={{ flex: 1, textAlign: "center", fontSize: ".85rem" }} onClick={closeMenu}>
            Partner login
          </a>
        </div>
        <div className="drawer-cta">
          <a
            className="btn btn-wa"
            href={waLink()}
            target="_blank"
            rel="noopener"
            onClick={closeMenu}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A2.8 2.8 0 0 0 6.7 9c0 1.7 1.2 3.3 1.4 3.5s2.4 3.6 5.7 5c2 .9 2.8.9 3.8.8.6-.1 1.9-.8 2.1-1.5s.3-1.4.2-1.5-.3-.2-.5-.3Z" />
            </svg>
            WhatsApp
          </a>
          <BookButton className="btn btn-gold" onClick={closeMenu}>
            Book a consultation
          </BookButton>
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

        .nav-links{ gap:1.4rem; }
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
