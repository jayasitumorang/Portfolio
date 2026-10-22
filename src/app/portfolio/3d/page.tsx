import type { Metadata } from "next";
import { CareerWalk, type RepoLite } from "@/components/CareerWalk";
import { SiteNav } from "@/components/SiteNav";
import { getGitHub } from "@/lib/github";

export const metadata: Metadata = { title: "Portfolio in 3D · Jaya Situmorang" };

// The CV as one 3D walk-through (CareerWalk). GitHub repos are fetched on the server,
// cached and refreshed by the webhook, then shown in the gallery room.
export default async function Portfolio3D() {
  const { repos } = await getGitHub(6);
  const lite: RepoLite[] | null =
    repos?.map(({ name, description, language, pushed_at, html_url, stargazers_count }) => ({
      name, description, language, pushed_at, html_url, stargazers_count,
    })) ?? null;

  return (
    <>
      <SiteNav tab="portfolio" mode="3d" />
      <main id="top" className="walk-page">
        <CareerWalk repos={lite} />
      </main>
    </>
  );
}
