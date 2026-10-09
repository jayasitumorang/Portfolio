import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { hiddenRepos, profile } from "@/data/profile";

// All GitHub data is cached under this tag. The webhook route expires it on push,
// and the "hours" cache profile also refreshes it every hour on its own.
export const GITHUB_TAG = "github";
const API = "https://api.github.com";

export type Repo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  topics?: string[];
};

type RawEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: { ref?: string | null; ref_type?: string; action?: string; size?: number };
};

export type Activity = { id: string; when: string; repo: string; text: string };

async function gh<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${profile.github}-portfolio`,
  };
  // Optional: a token raises the rate limit from 60 to 5000 requests per hour.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`${API}${path}`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getRepos(limit: number) {
  const repos = await gh<Repo[]>(`/users/${profile.github}/repos?per_page=100&sort=pushed`);
  if (!repos) return null;
  return repos
    .filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== profile.github.toLowerCase())
    .filter((r) => !hiddenRepos.some((h) => h.toLowerCase() === r.name.toLowerCase()))
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, limit);
}

function describe(e: RawEvent): string | null {
  const branch = e.payload.ref?.replace("refs/heads/", "");
  switch (e.type) {
    case "PushEvent":
      return branch ? `Pushed to ${branch}` : "Pushed commits";
    case "CreateEvent":
      return e.payload.ref_type === "repository" ? "Created the repository" : `Created ${e.payload.ref_type} ${e.payload.ref ?? ""}`.trim();
    case "PullRequestEvent":
      return e.payload.action ? `${capitalize(e.payload.action)} a pull request` : "Updated a pull request";
    case "ReleaseEvent":
      return "Published a release";
    case "PublicEvent":
      return "Made the repository public";
    case "IssuesEvent":
      return e.payload.action ? `${capitalize(e.payload.action)} an issue` : "Updated an issue";
    default:
      return null;
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function getActivity(limit: number) {
  const events = await gh<RawEvent[]>(`/users/${profile.github}/events/public?per_page=30`);
  if (!events) return null;
  const out: Activity[] = [];
  for (const e of events) {
    const text = describe(e);
    if (text) out.push({ id: e.id, when: e.created_at, repo: e.repo.name.split("/")[1] ?? e.repo.name, text });
    if (out.length >= limit) break;
  }
  return out;
}

/** Repos + recent activity, cached together so one webhook refreshes both. */
export async function getGitHub(limit = 6) {
  "use cache";
  cacheTag(GITHUB_TAG);
  cacheLife("hours");
  const [repos, activity] = await Promise.all([getRepos(limit), getActivity(limit)]);
  return { repos, activity, fetchedAt: new Date().toISOString() };
}
