"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { SITE } from "@/lib/site";

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function EbookAccessPage() {
  const [ref, setRef] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRef(params.get("ref"));
    setStatus(params.get("status"));
    setEmail(params.get("email"));
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  const isPaid = status === "paid";

  return (
    <>
      <Nav />
      <section
        style={{
          background: isPaid
            ? "linear-gradient(165deg,#0e2518 0%,#1a3828 100%)"
            : "linear-gradient(165deg,#3a1c1c 0%,#5a2828 100%)",
          padding: "4rem 1.5rem",
          color: "var(--paper)",
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="wrap" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          {isPaid ? (
            <>
              <div
                style={{
                  fontSize: "3rem",
                  margin: "0 0 1rem",
                }}
              >
                ✓
              </div>
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "2rem",
                  color: "#fff",
                  margin: "0 0 1rem",
                }}
              >
                Payment Successful
              </h1>
              <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "2rem" }}>
                Thank you! Your H.O.M.E.™ Buyers Guide is ready to download. We've also sent a
                link to <strong>{email}</strong>.
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  className="btn btn-gold"
                  href={`${SITE.ebookApp}HOME-Guide-Ferguson-Law.pdf`}
                  target="_blank"
                  rel="noopener"
                >
                  Download PDF <ArrowIcon />
                </a>
                <a className="btn btn-light" href="/buyers-guide">
                  Back to Guide
                </a>
              </div>
              <p style={{ marginTop: "2rem", fontSize: ".9rem", color: "rgba(246,242,234,.6)" }}>
                Order ref: {ref}
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "3rem", margin: "0 0 1rem", color: "#faa" }}>
                ✗
              </div>
              <h1
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: "2rem",
                  color: "#fff",
                  margin: "0 0 1rem",
                }}
              >
                Payment Could Not Be Processed
              </h1>
              <p style={{ color: "rgba(246,242,234,.78)", marginBottom: "2rem" }}>
                Something went wrong with your payment. Please try again, or contact us for assistance.
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <a className="btn btn-gold" href="/buyers-guide">
                  Try Again <ArrowIcon />
                </a>
                <a className="btn btn-light" href="/contact">
                  Contact Us
                </a>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
