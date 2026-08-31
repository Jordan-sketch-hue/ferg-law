"use client";

import { track } from "@/lib/analytics";
import type { ReactNode } from "react";

export default function GetStartedLink({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href="/get-started"
      style={style}
      onClick={() => track("get_started_click")}
    >
      {children}
    </a>
  );
}
