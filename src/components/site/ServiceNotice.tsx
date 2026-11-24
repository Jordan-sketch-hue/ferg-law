"use client";
import { AlertTriangle } from "lucide-react";

interface ServiceNoticeProps {
  compact?: boolean;
}

export function ServiceNotice({ compact }: ServiceNoticeProps) {
  if (compact) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)",
        borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e",
        marginBottom: 12
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, color: "#d97706" }} />
        <span>We are aware of a service disruption and are actively resolving it.</span>
      </div>
    );
  }
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "#1a1a1a", borderBottom: "1px solid #d97706",
      padding: "10px 20px", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 10
    }}>
      <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13.5, color: "#fef3c7", fontWeight: 500 }}>
        We are aware of a temporary service disruption. All systems are being restored - we apologize for the inconvenience.
      </p>
    </div>
  );
}