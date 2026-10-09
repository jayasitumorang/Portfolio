import { CareerWalk, type RepoLite } from "@/components/CareerWalk";
import { ThemeToggle } from "@/components/ThemeToggle";
import { profile } from "@/data/profile";
import { getGitHub } from "@/lib/github";

// The whole site is one 3D walk-through (CareerWalk). GitHub repos are fetched on the server,
// cached and refreshed by the webhook, then shown in the gallery room.
export default async function Home() {
  const { repos } = await getGitHub(6);
  const lite: RepoLite[] | null =
    repos?.map(({ name, description, language, pushed_at, html_url, stargazers_count }) => ({
      name, description, language, pushed_at, html_url, stargazers_count,
    })) ?? null;

  return (
    <>
      <header className="nav">
        <nav className="wrap nav-in" aria-label="Main">
          <a href="#top" className="mark">
            <i>{profile.initials}</i>
            {profile.shortName}
          </a>
          <div className="theme-slot">
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main id="top">
        <CareerWalk repos={lite} />
      </main>
    </>
  );
}
