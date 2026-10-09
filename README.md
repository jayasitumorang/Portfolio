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
   - `NEXT_PUBLIC_SITE_URL` (optional): your final address, for example `https://jayasitumorang.vercel.app`.
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

## How it works

| Piece | File |
|---|---|
| Content | `src/data/profile.ts` |
| GitHub data (cached, tagged `github`, hourly refresh) | `src/lib/github.ts` |
| Webhook (verifies GitHub's signature, then expires the cache) | `src/app/api/github-webhook/route.ts` |
| Page | `src/app/page.tsx` |
| Share preview image | `src/app/opengraph-image.tsx` |
