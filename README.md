# Sieve dashboard

![status](https://img.shields.io/badge/status-alpha-orange)
![stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Cloudflare%20Pages-blue)
![data](https://img.shields.io/badge/database-none-lightgrey)

The hosted companion to [Sieve](https://github.com/khoitrn/sieve) — a
read-only website with four views: browse the skill pool you'd actually
pull into a project, connect your own skill repos, author skills by hand,
and inspect whether a specific public repo is running the protocol.

Separate repo from `sievekit` on purpose: this is a hosted viewer and
authoring surface, not a feature of the npm package. No account, no
database on this side — identity and skill data live in
[`sieve-registry`](https://github.com/khoitrn/sieve-registry); this app is
the UI on top of it.

## The four tabs

| Tab | Sign-in | What it does |
| --- | --- | --- |
| **Library** | optional | Your actual skill pool: curated catalog + connected sources + your own custom skills, live from the registry. Each row reads `from <source>` so curated/connected/custom are easy to tell apart. Signed out, you see the curated pool only. |
| **Sources** | required | Connect an external repo (`owner/repo`) as a skill source. The registry walks every `SKILL.md` in its tree and folds it into your Library and onboarding recommendations — never anyone else's. |
| **Custom** | required | Author skills in the browser: name, description, category, tags, instructions. Scoped to your GitHub identity (`custom:<login>`), not a repo — no source to connect, nothing for the sync loop to pull. You *are* the source of truth. |
| **Dashboard** | optional | The original per-repo inspector. Point it at any public `owner/repo` and it reads `AGENTS.md`, `sieve.index.json`, `HISTORY.jsonl`, `PROGRESS.md`, and `scripts/bridge.mjs` straight from `raw.githubusercontent.com` — skill catalog, guardrail vs. catalog split, real history mentions, a 30-day activity trend. No `AGENTS.md` gets an honest empty state, never fabricated numbers. |

Library, Sources, and Custom talk to the registry's API. Dashboard talks
directly to GitHub's raw CDN and never touches the registry.

## Sign-in

GitHub or GitLab, your choice, and optional for Dashboard — required for
Sources and Custom, and for Library to show anything beyond the curated
pool. No account and no database on this side: the OAuth token lives in
your browser's `localStorage` only, never on a server. The one
server-side step is a Cloudflare Pages Function that exchanges the OAuth
code for a token without exposing the client secret, then hands the token
back in a URL fragment and forgets it.

## Related projects

- **[sieve](https://github.com/khoitrn/sieve)** — the npm package (`npx sievekit init`). Start here.
- **[sieve-registry](https://github.com/khoitrn/sieve-registry)** — the Worker + D1 API this app is a UI on top of.
- **sieve-dashboard** (this repo) — the hosted UI, at [sieve.khoitrn.com](https://sieve.khoitrn.com).

## Develop

```bash
npm run dev
```

Visit `http://localhost:3000/?repo=owner/name` for the Dashboard view on
any public repo, or use the picker on the page — it accepts a typed
`owner/repo` or a full `github.com/...` URL. `/library`, `/sources`, and
`/custom` need no query param.

## Sign-in setup

Sign-in needs two things you create yourself, per provider: an OAuth App
(gives you a client ID + secret) and, locally, `wrangler pages dev` instead
of `next dev` — `next dev` doesn't know about the Pages Functions that do
the token exchange, only Cloudflare's dev server does.

1. **Register an OAuth App.**
   - GitHub: [github.com/settings/developers](https://github.com/settings/developers)
     → New OAuth App. Authorization callback URL: exactly
     `http://localhost:3002/api/auth/callback/github` for local dev. GitHub
     OAuth Apps (classic) only allow one callback URL each, so make a
     second app later for the production domain — don't try to reuse the
     dev app.
   - GitLab: [gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
     → Add new application, scopes `read_repository` + `read_user`. GitLab
     lets you list multiple redirect URIs on one Application, so
     `http://localhost:3002/api/auth/callback/gitlab` and the eventual prod
     URL can both live on the same app.

2. **Local secrets.** Copy `.dev.vars.example` → `.dev.vars` (gitignored)
   and `.env.local.example` → `.env.local` (gitignored), and fill in the
   client ID/secret from step 1. `NEXT_PUBLIC_*_CLIENT_ID` in `.env.local`
   is the same client ID as `.dev.vars` — one is read by the static build
   (to construct the sign-in redirect), the other by the Pages Function (to
   exchange the code).

3. **Run it:**
   ```bash
   npm run build         # static export to ./out (also runs `wrangler types`)
   npm run pages:dev     # wrangler pages dev ./out, on http://localhost:3002
   ```
   Plain `npm run dev` still works for everything except sign-in itself —
   the "Sign in" button will show "not configured" until the
   `NEXT_PUBLIC_*_CLIENT_ID` vars are set, and even then the callback needs
   `pages:dev`, not `next dev`, to actually complete.

4. **Production** — deployed at `https://sieve.khoitrn.com` (custom domain on
   the `sieve-dashboard` Cloudflare Pages project; the `.pages.dev` URL still
   resolves but isn't the canonical one):
   ```bash
   npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=sieve-dashboard
   npx wrangler pages secret put GITLAB_CLIENT_SECRET --project-name=sieve-dashboard
   ```
   plus a second, prod-only GitHub OAuth App with Authorization callback URL
   `https://sieve.khoitrn.com/api/auth/callback/github`, and
   `NEXT_PUBLIC_*_CLIENT_ID` / `GITHUB_CLIENT_ID` / `GITLAB_CLIENT_ID` set to
   match in the Pages project's build environment variables.

## Stack

Next.js (App Router, static export) + TypeScript + Tailwind v4, deployed on
Cloudflare Pages. No database, no server-held sessions on this side — all
Library/Sources/Custom state lives in `sieve-registry`; Dashboard re-fetches
straight from GitHub's raw CDN with a 5-minute revalidation window. The one
exception is two small Cloudflare Pages Functions
(`functions/api/auth/callback/{github,gitlab}.ts`) that exist solely to
exchange an OAuth code for a token without exposing the client secret to
the browser; they hold no state and see nothing else.
