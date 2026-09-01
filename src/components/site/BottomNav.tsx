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
      <div style={{ height: "calc(60px + env(safe-area-inset-bottom))" }} aria-hidden="true" />
      <nav
        aria-label="App navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9000,
          background: "#081410",
          borderTop: "1px solid rgba(200,166,92,0.18)",
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
                padding: "10px 0 8px",
                color: active ? "#C8A65C" : "rgba(200,166,92,0.38)",
                textDecoration: "none",
                gap: 3,
                transition: "color 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{
                fontSize: "0.58rem",
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
