import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { profile } from "@/data/profile";

type Tab = "home" | "portfolio";
type Mode = "classic" | "3d";

// Top bar shared by every page: Home and Portfolio tabs, and on Portfolio a switch between
// the classic CV and the 3D walk.
export function SiteNav({ tab, mode }: { tab: Tab; mode?: Mode }) {
  return (
    <header className="nav">
      <nav className="wrap nav-in" aria-label="Main">
        <Link href="/" className="mark">
          <i>{profile.initials}</i>
          <span className="mark-name">{profile.shortName}</span>
        </Link>
        <div className="tabs" role="list">
          <Link role="listitem" href="/" className={tab === "home" ? "on" : undefined} aria-current={tab === "home" ? "page" : undefined}>
            Home
          </Link>
          <Link
            role="listitem"
            href="/portfolio"
            className={tab === "portfolio" ? "on" : undefined}
            aria-current={tab === "portfolio" ? "page" : undefined}
          >
            Portfolio
          </Link>
        </div>
        {mode && (
          <div className="mode" aria-label="Portfolio view">
            <Link href="/portfolio" className={mode === "classic" ? "on" : undefined} aria-current={mode === "classic" ? "page" : undefined}>
              Classic
            </Link>
            <Link href="/portfolio/3d" className={mode === "3d" ? "on" : undefined} aria-current={mode === "3d" ? "page" : undefined}>
              3D
            </Link>
          </div>
        )}
        <div className="theme-slot">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
