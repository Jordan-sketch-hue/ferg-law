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
import "./faq.css";

export const metadata: Metadata = {
  title: "FAQ — Ferguson Law | Buying property in Jamaica & overseas",
  description:
    "Answers to common questions about Ferguson Law's services, fees and consultations — plus a full guide for overseas buyers purchasing property in Jamaica from abroad.",
  alternates: { canonical: "/faq" },
};

/** Render an answer string ("\n\n" = new paragraph, "\n" = line break). */
function Answer({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <React.Fragment key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

export default function FaqPage() {
  return (
    <BookingProvider>
    <div className="faq-page">
      <Nav />

      <span id="top"></span>

      {/* HERO */}
      <header className="faq-hero">
        <div className="wrap">
          <span className="eyebrow">Answers, up front</span>
          <h1>Frequently asked questions</h1>
          <p className="lead">
            Clear, practical answers about working with Ferguson Law — including
            everything overseas buyers need to know before purchasing property
            in Jamaica.
          </p>
        </div>
      </header>

      {/* BODY */}
      <main className="faq-body">
        <div className="wrap">
          {FAQ_GROUPS.map((group) => (
            <section key={group.id} className="faq-group reveal" id={group.id}>
              <h2>{group.title}</h2>
              {group.intro && <p className="group-intro">{group.intro}</p>}

              {group.items.map((item, i) => (
                <details className="faq-item" key={i}>
                  <summary>
                    <span>{item.q}</span>
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
                    <Answer text={item.a} />
                    {item.bullets && (
                      <ul className="faq-checks">
                        {item.bullets.map((b, k) => (
                          <li key={k}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {item.after && <p className="faq-key">{item.after}</p>}
                  </div>
                </details>
              ))}
            </section>
          ))}

          {/* CLOSER */}
          <div className="faq-closer reveal">
            <h3>{FAQ_CLOSER.title}</h3>
            <p>{FAQ_CLOSER.body}</p>
            <div className="faq-cta">
              <Link className="btn btn-gold" href="/#contact">
                Book a consultation
              </Link>
              <a
                className="btn btn-light"
                href={waLink(
                  "Hi Ferguson Law — I have a question after reading your FAQ.",
                )}
                target="_blank"
                rel="noopener"
              >
                WhatsApp us
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
