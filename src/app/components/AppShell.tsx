import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.scrollTo(0, 0);
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>("main h1");
      if (!heading) return false;
      heading.tabIndex = -1;
      heading.focus();
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(document.getElementById("main")!, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [location.pathname, location.search]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" to="/">
          <span aria-hidden="true">◈</span> LocalRelay
        </Link>
        <nav className="main-nav" aria-label="Main">
          <NavLink to="/" end>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m3 10 9-7 9 7v10H3Z" />
              <path d="M9 20v-7h6v7" />
            </svg>{" "}
            Home
          </NavLink>
          <NavLink to="/operators">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m16 8-3 5-5 3 3-5Z" />
            </svg>{" "}
            Experiences
          </NavLink>
          <Link
            to="/outbox"
            aria-current={
              location.pathname.startsWith("/request") ||
              location.pathname.startsWith("/reply") ||
              location.pathname === "/outbox"
                ? "page"
                : undefined
            }
            className={
              location.pathname.startsWith("/request") ||
              location.pathname.startsWith("/reply") ||
              location.pathname === "/outbox"
                ? "active"
                : ""
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>{" "}
            Requests
          </Link>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">
        <p>Prepared on your phone. Exchanged by cellular SMS.</p>
        <nav aria-label="Tools and help">
          <Link to="/diagnostics">Diagnostics & help</Link>
          <Link to="/evaluation">Evaluation tools</Link>
          <Link to="/demo">Interactive demo</Link>
          <Link to="/simulate">Phone simulator</Link>
        </nav>
        <small>Saved records stay on this device.</small>
      </footer>
    </>
  );
}
