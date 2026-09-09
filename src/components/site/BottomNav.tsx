"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, FileText, User } from "lucide-react";

const TABS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/booking", icon: Calendar, label: "Book" },
  { href: "/directory", icon: Users, label: "Professionals" },
  { href: "/directory/client", icon: FileText, label: "My Matter" },
  { href: "/auth", icon: User, label: "Account" },
] as const;

export default function BottomNav() {
  const [isPwa, setIsPwa] = useState(false);
  const pathname = usePathname();

  // Find the longest-matching tab so /directory/client doesn't also activate /directory
  const activeHref = TABS.reduce<string | null>((best, tab) => {
    const matches = tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(tab.href + "/");
    if (matches && tab.href.length > (best?.length ?? 0)) return tab.href;
    return best;
  }, null);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsPwa(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsPwa(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  if (!isPwa) return null;

  return (
    <>
      <div style={{ height: "calc(80px + env(safe-area-inset-bottom))" }} aria-hidden="true" />
      <nav
        aria-label="App navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9000,
          background: "#081410",
          borderTop: "1px solid rgba(200,166,92,0.22)",
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 0 12px",
                color: active ? "#C8A65C" : "rgba(200,166,92,0.42)",
                textDecoration: "none",
                gap: 5,
                transition: "color 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Icon size={26} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{
                fontSize: "0.68rem",
                letterSpacing: "0.03em",
                fontFamily: "system-ui, sans-serif",
                fontWeight: active ? 600 : 400,
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
