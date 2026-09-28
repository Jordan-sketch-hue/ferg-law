"use client";
import { usePathname } from "next/navigation";

export function DirectoryFooter() {
  const pathname = usePathname();
  const isClientPortal = pathname.startsWith("/directory/dashboard");

  return (
    <footer className="dir-foot">
      <div className="dir-wrap">
        <a href="/">← Back to Ferguson Law</a>
        {!isClientPortal && (
          <p>
            Ferguson Law lists these professionals as a convenience and does not
            endorse or guarantee any of them. © {new Date().getFullYear()} Ferguson Law.
          </p>
        )}
      </div>
    </footer>
  );
}
