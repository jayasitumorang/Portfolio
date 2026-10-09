import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { GITHUB_TAG } from "@/lib/github";

// GitHub calls this URL when something happens in a repository (push, new repo, release...).
// It checks the signature with GITHUB_WEBHOOK_SECRET, then expires the cached GitHub data so
// the next visitor sees the change. Setup steps are in README.md.

const REFRESH_EVENTS = new Set(["push", "create", "delete", "release", "repository", "public", "star", "pull_request"]);

function validSignature(body: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(body).digest("hex")}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "GITHUB_WEBHOOK_SECRET is not set on the server." }, { status: 500 });

  const body = await req.text();
  if (!validSignature(body, req.headers.get("x-hub-signature-256"), secret)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = req.headers.get("x-github-event") ?? "";
  if (event === "ping") return Response.json({ ok: true, message: "Webhook connected." });
  if (!REFRESH_EVENTS.has(event)) return Response.json({ ok: true, refreshed: false, event });

  revalidateTag(GITHUB_TAG, { expire: 0 });
  return Response.json({ ok: true, refreshed: true, event });
}

export function GET() {
  return Response.json({ ok: true, message: "GitHub webhook endpoint. GitHub sends POST requests here." });
}
