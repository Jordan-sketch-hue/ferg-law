"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, BookOpen, User } from "lucide-react";

const PenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
);

export default function BottomNav() {
  const [isPwa, setIsPwa] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsPwa(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsPwa(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  if (!isPwa) return null;

  const isHome = pathname === "/";
  const isBook = pathname === "/booking" || pathname.startsWith("/booking/");
  const isResources = pathname === "/buyers-guide" || pathname === "/explainers" || pathname.startsWith("/explainers/") || pathname === "/cost-estimator" || pathname === "/glossary" || pathname === "/faq";
  const isStart = pathname === "/get-started";
  const isAccount = pathname === "/auth" || pathname.startsWith("/directory/client") || pathname.startsWith("/auth/");

  const tab: React.CSSProperties = {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "14px 0 12px", textDecoration: "none",
    gap: 5, transition: "color 0.15s", WebkitTapHighlightColor: "transparent",
  };

  return (
    <>
      <div style={{ height: "calc(80px + env(safe-area-inset-bottom))" }} aria-hidden="true" />
      <nav
        aria-label="App navigation"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9000,
          background: "#081410", borderTop: "1px solid rgba(200,166,92,0.22)",
          display: "flex", alignItems: "flex-end",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Home */}
        <Link href="/" style={{ ...tab, color: isHome ? "#C8A65C" : "rgba(200,166,92,0.42)" }}>
          <Home size={24} strokeWidth={isHome ? 2.5 : 1.8} />
          <span style={{ fontSize: "0.66rem", letterSpacing: "0.03em", fontWeight: isHome ? 600 : 400 }}>Home</span>
        </Link>

        {/* Resources */}
        <Link href="/buyers-guide" style={{ ...tab, color: isResources ? "#C8A65C" : "rgba(200,166,92,0.42)" }}>
          <BookOpen size={24} strokeWidth={isResources ? 2.5 : 1.8} />
          <span style={{ fontSize: "0.66rem", letterSpacing: "0.03em", fontWeight: isResources ? 600 : 400 }}>Resources</span>
        </Link>

        {/* Get Started — raised gold center button */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 8 }}>
          <Link
            href="/get-started"
            aria-label="Get started"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              textDecoration: "none", WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{
              width: 52, height: 52, borderRadius: "50%",
              background: isStart ? "#a8862e" : "#C8A65C",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 18px rgba(200,166,92,0.45)",
              marginTop: -20,
              color: "#081410",
              transition: "background 0.15s",
            }}>
              <PenIcon />
            </span>
            <span style={{ fontSize: "0.66rem", letterSpacing: "0.03em", color: isStart ? "#C8A65C" : "rgba(200,166,92,0.6)", fontWeight: isStart ? 700 : 500, marginTop: 2 }}>
              Get started
            </span>
          </Link>
        </div>

        {/* Book */}
        <Link href="/booking" style={{ ...tab, color: isBook ? "#C8A65C" : "rgba(200,166,92,0.42)" }}>
          <Calendar size={24} strokeWidth={isBook ? 2.5 : 1.8} />
          <span style={{ fontSize: "0.66rem", letterSpacing: "0.03em", fontWeight: isBook ? 600 : 400 }}>Book</span>
        </Link>

        {/* Account */}
        <Link href="/auth" style={{ ...tab, color: isAccount ? "#C8A65C" : "rgba(200,166,92,0.42)" }}>
          <User size={24} strokeWidth={isAccount ? 2.5 : 1.8} />
          <span style={{ fontSize: "0.66rem", letterSpacing: "0.03em", fontWeight: isAccount ? 600 : 400 }}>Account</span>
        </Link>
      </nav>
    </>
  );
}