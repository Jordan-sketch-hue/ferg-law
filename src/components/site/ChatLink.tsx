"use client";
import type { ReactNode } from "react";

export default function ChatLink({ children }: { children: ReactNode }) {
  function open() {
    window.dispatchEvent(new CustomEvent("fl:open-chat"));
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
