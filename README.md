# Sieve dashboard

A read-only website that shows whether a public GitHub repo is running the
[Sieve](https://github.com/khoitrn/sieve) protocol — its skill catalog, which
skills are guardrails vs. catalog, real mentions of each skill in the repo's
own `HISTORY.jsonl`, and the protocol's file-based architecture.

Separate repo from `sievekit` on purpose: this is a hosted viewer of repos,
not a feature of the npm package. Every load reads `AGENTS.md`,
`sieve.index.json`, `HISTORY.jsonl`, `PROGRESS.md`, and `scripts/bridge.mjs`
straight from `raw.githubusercontent.com` and renders what's actually there.
A repo with no `AGENTS.md` gets an honest empty state, never fabricated
numbers. Anyone can type their own `owner/repo` into the picker; repos
you've viewed are remembered in your browser's `localStorage` only, nothing
is sent anywhere.

Signing in (GitHub or GitLab, your choice) is optional. There's still no
account and no database: the OAuth token lives in your browser's
`localStorage` only, never on a server — the one server-side step is a
Cloudflare Pages Function that exchanges the OAuth code for a token without
exposing the client secret, then hands the token back in a URL fragment and
forgets it. **Scope right now:** the sign-in flow itself is fully wired for
both providers; using the resulting token to read private repos or raise
API rate limits isn't plugged into the fetch layer yet — today's fetches
still go through the unauthenticated `raw.githubusercontent.com` path
regardless of whether you're signed in. See "Sign-in setup" below to get a
session working, and treat private-repo/rate-limit wiring as the next step.

While a repo is open, `HISTORY.jsonl` is rechecked every 90 seconds (paused
while the tab is hidden) so new events show up without a reload, and the
activity panel buckets the existing history into a 30-day trend instead of
just a single last-event stat.

## Develop

```bash
npm run dev
```

Visit `http://localhost:3000/?repo=owner/name` for any public repo, or use
the picker on the page — it now accepts a typed `owner/repo` or a full
`github.com/...` URL, not just the quick-pick list.

## Sign-in setup

Sign-in needs two things you create yourself, per provider: an OAuth App
(gives you a client ID + secret) and, locally, `wrangler pages dev` instead
of `next dev` — `next dev` doesn't know about the Pages Functions that do
the token exchange, only Cloudflare's dev server does.

1. **Register an OAuth App.**
   - GitHub: [github.com/settings/developers](https://github.com/settings/developers)
     → New OAuth App. Authorization callback URL: exactly
     `http://localhost:8788/api/auth/callback/github` for local dev. GitHub
     OAuth Apps (classic) only allow one callback URL each, so make a
     second app later for the production domain — don't try to reuse the
     dev app.
   - GitLab: [gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
     → Add new application, scopes `read_repository` + `read_user`. GitLab
     lets you list multiple redirect URIs on one Application, so
     `http://localhost:8788/api/auth/callback/gitlab` and the eventual prod
     URL can both live on the same app.

2. **Local secrets.** Copy `.dev.vars.example` → `.dev.vars` (gitignored)
   and `.env.local.example` → `.env.local` (gitignored), and fill in the
   client ID/secret from step 1. `NEXT_PUBLIC_*_CLIENT_ID` in `.env.local`
   is the same client ID as `.dev.vars` — one is read by the static build
   (to construct the sign-in redirect), the other by the Pages Function (to
   exchange the code).

3. **Run it:**
   ```bash
   npm run build        # static export to ./out (also runs `wrangler types`)
   npm run pages:dev     # wrangler pages dev ./out, on http://localhost:8788
   ```
   Plain `npm run dev` still works for everything except sign-in itself —
   the "Sign in" button will show "not configured" until the
   `NEXT_PUBLIC_*_CLIENT_ID` vars are set, and even then the callback needs
   `pages:dev`, not `next dev`, to actually complete.

4. **Production**, once there's a real Cloudflare Pages project:
   ```bash
   npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=sieve-dashboard
   npx wrangler pages secret put GITLAB_CLIENT_SECRET --project-name=sieve-dashboard
   ```
   plus a second, prod-only GitHub OAuth App pointed at the real domain's
   `/api/auth/callback/github`, and `NEXT_PUBLIC_*_CLIENT_ID` /
   `GITHUB_CLIENT_ID` / `GITLAB_CLIENT_ID` set to match in the Pages
   project's build environment variables.

## Stack

Next.js (App Router, static export) + TypeScript + Tailwind v4, deployed on
Cloudflare Pages. No database, no server-held sessions — every request
re-fetches from GitHub's raw CDN with a 5-minute revalidation window. The
one exception is two small Cloudflare Pages Functions
(`functions/api/auth/callback/{github,gitlab}.ts`) that exist solely to
exchange an OAuth code for a token without exposing the client secret to
the browser; they hold no state and see nothing else.
