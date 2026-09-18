/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Nav from "@/components/site/Nav";
import { BookingProvider } from "@/components/site/BookingProvider";
import Reveal from "@/components/site/Reveal";
import { waLink } from "@/lib/site";
import Footer from "@/components/site/Footer";
import { FAQ_GROUPS, FAQ_CLOSER } from "@/lib/faq";
import { CmsText } from "@/components/cms/CmsBlock";
import "./faq.css";

export const metadata: Metadata = {
  title: "FAQ — Ferguson Law | Buying property in Jamaica & overseas",
  description:
    "Answers to common questions about Ferguson Law's services, fees and consultations — plus a full guide for overseas buyers purchasing property in Jamaica from abroad.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <BookingProvider>
    <div className="faq-page">
      <Nav />

      <span id="top"></span>

      {/* HERO */}
      <header className="faq-hero">
        <div className="wrap">
          <span className="eyebrow">
            <CmsText page="faq" block="hero_eyebrow" fallback="Answers, up front" />
          </span>
          <h1>
            <CmsText page="faq" block="hero_h1" fallback="Frequently asked questions" />
          </h1>
          <p className="lead">
            <CmsText page="faq" block="hero_lede" fallback="Clear, practical answers about working with Ferguson Law - including everything overseas buyers need to know before purchasing property in Jamaica." />
          </p>
        </div>
      </header>

      {/* BODY */}
      <main className="faq-body">
        <div className="wrap">
          {FAQ_GROUPS.map((group) => (
            <section key={group.id} className="faq-group reveal" id={group.id}>
              <h2>
                <CmsText page="faq" block={`${group.id}_title`} fallback={group.title} />
              </h2>
              {group.intro && (
                <p className="group-intro">
                  <CmsText page="faq" block={`${group.id}_intro`} fallback={group.intro} />
                </p>
              )}

              {group.items.map((item, i) => (
                <details className="faq-item" key={i}>
                  <summary>
                    <span>
                      <CmsText page="faq" block={`${group.id}_q${i}`} fallback={item.q} />
                    </span>
                    <svg
                      className="chev"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </summary>
                  <div className="faq-answer">
                    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                      <CmsText page="faq" block={`${group.id}_a${i}`} fallback={item.a} />
                    </p>
                    {item.bullets && (
                      <ul className="faq-checks">
                        {item.bullets.map((b, k) => (
                          <li key={k}>
                            <CmsText page="faq" block={`${group.id}_q${i}_bullet_${k}`} fallback={b} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.after && (
                      <p className="faq-key">
                        <CmsText page="faq" block={`${group.id}_after${i}`} fallback={item.after} />
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </section>
          ))}

          {/* CLOSER */}
          <div className="faq-closer reveal">
            <h3>
              <CmsText page="faq" block="closer_title" fallback={FAQ_CLOSER.title} />
            </h3>
            <p>
              <CmsText page="faq" block="closer_body" fallback={FAQ_CLOSER.body} />
            </p>
            <div className="faq-cta">
              <Link className="btn btn-gold" href="/#contact">
                <CmsText page="faq" block="closer_btn_book" fallback="Book a consultation" />
              </Link>
              <a
                className="btn btn-light"
                href={waLink("Hi Ferguson Law — I have a question after reading your FAQ.")}
              >
                <CmsText page="faq" block="closer_btn_wa" fallback="WhatsApp us" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <Footer />

      <Reveal />
    </div>
    </BookingProvider>
  );
}