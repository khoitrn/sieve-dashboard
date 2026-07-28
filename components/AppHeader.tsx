"use client";

import Link from "next/link";
import { RepoPicker } from "@/components/RepoPicker";

export function AppHeader({
  active,
  current,
  children,
}: {
  active: "dashboard" | "library";
  current: string;
  children?: React.ReactNode;
}) {
  const repoQuery = `?repo=${encodeURIComponent(current)}`;

  return (
    <header className="topbar">
      <div className="brand">
        <h1 className="brand-mark">
          [<span>&#9642;</span>] SIEVE
        </h1>
        <span className="brand-tag">Project visibility</span>
      </div>

      <nav className="main-nav" aria-label="Sections">
        <Link href={`/${repoQuery}`} className={`nav-link${active === "dashboard" ? " active" : ""}`}>
          Dashboard
        </Link>
        <Link href={`/library${repoQuery}`} className={`nav-link${active === "library" ? " active" : ""}`}>
          Library
        </Link>
      </nav>

      <div className="topbar-right">
        <span className="local-badge">
          <span className="dot good" />
          Public GitHub &middot; reads files in your browser, no account
        </span>
        {children}
        <RepoPicker current={current} />
      </div>
    </header>
  );
}
