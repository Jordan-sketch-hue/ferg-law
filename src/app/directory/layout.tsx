/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import "./directory.css";
import { DirectoryFooter } from "./DirectoryFooter";

export const metadata: Metadata = {
  title: "Find a Professional — H.O.M.E.® by Ferguson Law",
  description:
    "Browse vetted Jamaican real estate agents, bankers, land surveyors and valuators in the H.O.M.E.® professional directory by Ferguson Law.",
};

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="dir-header dir-header-dark">
        <div className="dir-wrap row">
          <a className="dir-brand" href="/" aria-label="H.O.M.E.® Professional Directory by Ferguson Law">
            <img src="/img/logo-ferguson.png" alt="Ferguson Law" />
            <small>H.O.M.E.® Professional Directory</small>
          </a>
          <nav className="dir-nav">
            <a href="/">Home</a>
            <a href="/directory">Browse</a>
            <a className="ghost hide-sm" href="/directory/client-login">
              Client portal
            </a>
            <a className="ghost hide-sm" href="/directory/login">
              Partner login
            </a>
            <a href="/directory/join">List your business</a>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <DirectoryFooter />
    </>
  );
}
