/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import "./directory.css";

export const metadata: Metadata = {
  title: "Find a Professional — H.O.M.E.™ by Ferguson Law",
  description:
    "Browse vetted Jamaican real estate agents, loan officers, land surveyors and valuators in the H.O.M.E.™ professional directory by Ferguson Law.",
};

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="dir-header dir-header-dark">
        <div className="dir-wrap row">
          <a className="dir-brand" href="/" aria-label="H.O.M.E.™ Professional Directory by Ferguson Law">
            <img src="/img/logo-ferguson.png" alt="Ferguson Law" />
            <small>H.O.M.E.™ Professional Directory</small>
          </a>
          <nav className="dir-nav">
            <a href="/">Home</a>
            <a href="/directory">Browse</a>
            <a className="ghost hide-sm" href="/directory/login">
              Partner login
            </a>
            <a href="/directory/join">List your business</a>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="dir-foot">
        <div className="dir-wrap">
          <a href="/">← Back to Ferguson Law</a>
          <p>
            Ferguson Law lists these professionals as a convenience and does not
            endorse or guarantee any of them. © {new Date().getFullYear()} Ferguson Law.
          </p>
        </div>
      </footer>
    </>
  );
}
