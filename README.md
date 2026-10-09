# Jaya Situmorang · Portfolio

Personal site built with Next.js (App Router) and TypeScript. The **Projects** section shows my public GitHub repositories and recent activity, refreshed instantly by a GitHub webhook and every hour on its own.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Edit the content

All text (summary, experience, skills, certificates, contact) is in [`src/data/profile.ts`](src/data/profile.ts). Change it there and the whole site updates.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On https://vercel.com click **Add New → Project**, import the repository and click **Deploy**. Vercel detects Next.js; no settings needed.
3. Under **Project → Settings → Environment Variables** add:
   - `GITHUB_WEBHOOK_SECRET`: a long random string (for example from a password generator).
   - `GITHUB_TOKEN` (optional): a GitHub token with no scopes, to avoid API rate limits.
   - `SITE_URL` (optional): only if you use a custom domain. Otherwise the Vercel address is detected automatically.
4. Redeploy once so the variables take effect.

From then on, **every push to this repository deploys the site automatically**. That's Vercel's GitHub integration; nothing else to set up.

## Connect the GitHub webhook (live projects)

The webhook tells the site to refresh the Projects section the moment you push to one of your repositories.

1. Open a repository you want to trigger updates, for example `MT5_Trading`, and go to **Settings → Webhooks → Add webhook**.
2. Fill in:
   - **Payload URL**: `https://<your-site>.vercel.app/api/github-webhook`
   - **Content type**: `application/json`
   - **Secret**: the same value as `GITHUB_WEBHOOK_SECRET`
   - **Events**: "Just the push event" is enough, or choose "Send me everything"
3. Click **Add webhook**. GitHub sends a test ping; a green tick means it's connected.

Personal GitHub accounts have webhooks per repository, not one for the whole account, so add it to the repositories you work on most. The other repositories still show up: the site refreshes all GitHub data every hour without a webhook.

## Visitor log (Supabase)

Each page view is stored in a Supabase table called `log_viewers`, and the numbers are on a private, password-protected page at `/stats`. No IP addresses are stored: each visitor gets an anonymous ID that changes every day.

1. In Supabase, open **SQL Editor → New query**, paste [`supabase/log_viewers.sql`](supabase/log_viewers.sql) and click **Run**.
2. In Supabase, open **Project Settings → API Keys** and create a **secret key** (`sb_secret_…`).
3. In Vercel, open **Settings → Environment Variables** and add:
   - `SUPABASE_URL`: `https://<project-id>.supabase.co`
   - `SUPABASE_SECRET_KEY`: the secret key (mark it **Sensitive**)
   - `STATS_PASSWORD`: a password for the stats page
4. Redeploy. Visits now appear in Supabase → **Table Editor → log_viewers** and on `/stats`.

To stop counting your own visits, open the site once with `?notrack` at the end of the address on each of your devices. `?track` turns counting back on.

## How it works

| Piece | File |
|---|---|
| Content | `src/data/profile.ts` |
| GitHub data (cached, tagged `github`, hourly refresh) | `src/lib/github.ts` |
| Webhook (verifies GitHub's signature, then expires the cache) | `src/app/api/github-webhook/route.ts` |
| Page | `src/app/page.tsx` |
| Share preview image | `src/app/opengraph-image.tsx` |
| Visitor tracking (browser → server → Supabase) | `src/components/Tracker.tsx`, `src/app/api/track/route.ts` |
| Stats page | `src/app/stats/` |
| Table definition | `supabase/log_viewers.sql` |
