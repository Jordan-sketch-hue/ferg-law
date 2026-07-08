/* eslint-disable @next/next/no-img-element */

/**
 * Pill-badge CTA for H.O.M.E.™ links — matches the nav badge style.
 * Use whenever a button takes the user to the H.O.M.E. platform or its resources.
 * Pass dark={true} when the badge sits on a dark green/black background.
 */
export function HomeBadge({
  href,
  children,
  external = false,
  dark = false,
  style,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  dark?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`home-badge-cta${dark ? " home-badge-dark" : ""} ${className}`.trim()}
      style={style}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
    >
      <span>{children}</span>
      <svg className="home-badge-arrow" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M1 5h12M8 1l5 4-5 4"/>
      </svg>
    </a>
  );
}

export const HomeBadgeCSS = `
.home-badge-cta{
  display:inline-flex; align-items:center; gap:.55rem;
  background:rgba(200,166,92,.13); border:1.5px solid rgba(200,166,92,.45);
  border-radius:999px; padding:.55rem 1.1rem .55rem .65rem;
  font-size:.9rem; font-weight:600; color:var(--ink);
  text-decoration:none; transition:background .15s, transform .15s, box-shadow .15s;
  white-space:nowrap;
}
.home-badge-cta:hover{
  background:rgba(200,166,92,.22);
  transform:translateY(-1px);
  box-shadow:0 6px 20px -6px rgba(200,166,92,.35);
}
.home-badge-mark{ width:22px; height:22px; object-fit:contain; flex-shrink:0; }
.home-badge-arrow{ width:14px; height:10px; color:var(--gold-deep); flex-shrink:0; }
/* Dark background variant — use dark={true} prop */
.home-badge-dark{
  color:#fff !important;
  border-color:rgba(200,166,92,.6) !important;
  background:rgba(200,166,92,.18) !important;
}
.home-badge-dark:hover{
  background:rgba(200,166,92,.3) !important;
  box-shadow:0 8px 24px -6px rgba(200,166,92,.4);
}
.home-badge-dark .home-badge-arrow{ color:var(--gold); }
`;
