"use client";
import type { ReactNode } from "react";

export default function ChatLink({ children }: { children: ReactNode }) {
  function open() {
    // Clear hash first so hashchange always fires, even if already #chat
    window.history.replaceState(null, "", window.location.pathname);
    window.location.hash = "chat";
  }
  return (
    <div
      className="reach-card reveal"
      role="button"
      tabIndex={0}
      aria-label="Open live chat"
      style={{ cursor: "pointer" }}
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") open(); }}
    >
      {children}
    </div>
  );
}
