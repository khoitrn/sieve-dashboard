# Sieve dashboard

![status](https://img.shields.io/badge/status-alpha-orange)
![stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Cloudflare%20Pages-blue)
![data](https://img.shields.io/badge/database-none-lightgrey)

### 👉 Just want to use it? Go to **[sieve.khoitrn.com](https://sieve.khoitrn.com)** — nothing to install, no sign-in needed to look around.

<!-- TODO: screenshot of the dashboard goes here, e.g. ![Sieve dashboard, Library tab](./docs/screenshot.png) -->

A website for looking at [Sieve](https://github.com/khoitrn/sieve) skills without touching a terminal — browse what's available, see if a project is set up with Sieve, connect your own repo, or write a skill by hand, all in a browser.

The link above is the maintainer's own personal instance — a live demo anyone's welcome to look around on, not an official hosted service. Just looking needs nothing at all. If you sign in there to connect a repo or author a skill, read [where that data actually lives](#where-does-your-data-live) first, or skip straight to [running your own copy](#run-your-own-copy-end-to-end) if you'd rather your data stayed yours — that part's optional and only matters once you're ready for it.

Separate repo from `sievekit` on purpose: this is a hosted viewer and
authoring surface, not a feature of the npm package.

## The navigation bar at the top of every page

However you land on the site, the same bar sits across the top of the screen the whole time — four labeled links on the right side (**Dashboard**, **Library**, **Sources**, **Custom**), and a **Sign in** button next to them. That bar is how you get from any one view to any other; you never need to know a URL or use the browser's back button.

| Tab (top of screen) | Sign in required? | What it does |
| --- | --- | --- |
| **Dashboard** | No | The original view: point it at any public `owner/repo` (type it into the box that appears next to the nav bar, or paste a `github.com/...` link) and see whether that project is set up with Sieve — its skill list, its recent activity, at a glance. |
| **Library** | Optional | Your actual skill pool: the shared catalog, plus anything you've connected under Sources, plus anything you've written under Custom — all in one list, live. Signed out, you still see the shared catalog, just not your own additions. |
| **Sources** | Yes | Where you connect one of *your own* repos (just type `owner/repo`) so its skills show up in your Library. This is the "hook up your own skills" step. |
| **Custom** | Yes | Where you write a skill by hand, right in the browser — a name, a description, and the instructions — with no repo needed at all. This is the "author a skill from scratch" step. |

Library, Sources, and Custom talk to the registry's API. Dashboard talks
directly to GitHub's raw CDN and never touches the registry.

## Signing in

Look for the **Sign in** button in the top-right corner, next to the navigation bar — that's the one control that unlocks Sources, Custom, and your own entries in Library. Choose GitHub or GitLab, whichever you use; either works the same way. You don't need to sign in at all to use Dashboard, or to browse the shared Library.

There's nothing to set up on your end beyond clicking that button — no account to create, no password, no email. Under the hood: no database on *this* app, the sign-in token stays only in your own browser's local storage, and it's never seen by a server except for the one moment it's first exchanged. Where the actual skill data goes is a separate question — that's next.

## Where does your data live?

This app has no database of its own — it's a UI. Everything you do under Sources or Custom gets sent to whichever **sieve-registry** the app is currently pointed at, and that's where it's actually stored (a Cloudflare D1 database). It's scoped to your own GitHub/GitLab identity — other people using the same registry never see it — but it still physically lives in *that registry's* database, not on your own machine.

By default, every copy of this app — including the live one at sieve.khoitrn.com — points at the maintainer's own deployed registry (`sieve-registry.khoitrn.workers.dev`). So if you sign in and connect a Source or write a Custom skill on sieve.khoitrn.com, that data is stored in the maintainer's database, not yours. That's fine for trying it out; it's worth knowing before you rely on it for anything you'd rather keep under your own control.

The fix is to run your own registry and point your own copy of this app at it — the walkthrough below covers both.

## Run your own copy, end to end

Optional — most people never need this section, it's only for keeping your own data out of the maintainer's database. Three things, done in order: your own registry, your own OAuth apps, then this app pointed at both. About 15 minutes for all three; skip step 1 if you're fine using the maintainer's registry.

<details>
<summary><strong>Show the 6 setup steps</strong></summary>

### 1. Deploy your own sieve-registry (optional, but this is what makes the data yours)

Follow [sieve-registry's own Deploy steps](https://github.com/khoitrn/sieve-registry#deploy) — a handful of `wrangler` commands, no code to write. Note the URL it gives you at the end, e.g. `https://sieve-registry.<you>.workers.dev` — you'll need it in step 4.

### 2. Clone and install this app

```bash
git clone https://github.com/khoitrn/sieve-dashboard
cd sieve-dashboard
npm install
```

### 3. Register your own OAuth apps

Sign-in needs an OAuth App you create yourself, per provider — this app never uses the maintainer's:

- **GitHub**: [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App. Authorization callback URL: exactly `http://localhost:3002/api/auth/callback/github` for local dev. GitHub OAuth Apps (classic) only allow one callback URL each, so you'll register a second app later for your production domain — don't try to reuse the dev app.
- **GitLab**: [gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications) → Add new application, scopes `read_repository` + `read_user`. GitLab allows multiple redirect URIs on one Application, so `http://localhost:3002/api/auth/callback/gitlab` and your eventual production URL can share one app.

You only strictly need one provider (GitHub or GitLab) to get sign-in working — set up the other later if you want it too.

### 4. Fill in your local config

```bash
cp .dev.vars.example .dev.vars
cp .env.local.example .env.local
```

- **`.dev.vars`** (server-side only, never sent to the browser): the OAuth client ID + secret from step 3, per provider.
- **`.env.local`** (safe in the browser — just builds the "Sign in" link): the *same* client IDs again, plus `NEXT_PUBLIC_SIEVE_REGISTRY_URL` — set this to the URL from step 1 if you deployed your own registry; leave it blank to fall back to the maintainer's.

### 5. Run it on localhost

```bash
npm run build         # static export to ./out (also runs `wrangler types`)
npm run pages:dev     # wrangler pages dev ./out, on http://localhost:3002
```

Open `http://localhost:3002` — that's your own copy, running locally, talking to your own registry if you set one up. Plain `npm run dev` also works for just browsing, but sign-in specifically needs `pages:dev`: it's the only local server that runs the Pages Function that completes the OAuth token exchange, which `next dev` doesn't know about.

### 6. Optional: put it on the internet, not just localhost

To get your own public URL (a `*.pages.dev` address, or your own custom domain) instead of only running locally:

```bash
npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name=<your-project-name>
npx wrangler pages secret put GITLAB_CLIENT_SECRET --project-name=<your-project-name>
```

then register a second, production-only OAuth App per provider pointed at your real domain (e.g. callback URL `https://<your-domain>/api/auth/callback/github`), and set `NEXT_PUBLIC_GITHUB_CLIENT_ID` / `NEXT_PUBLIC_GITLAB_CLIENT_ID` / `NEXT_PUBLIC_SIEVE_REGISTRY_URL` to match in that Cloudflare Pages project's build environment variables. This is exactly how sieve.khoitrn.com itself is deployed — same steps, just under the maintainer's own domain and OAuth apps instead of yours.

</details>

## Related projects

- **[sieve](https://github.com/khoitrn/sieve)** — the npm package (`npx sievekit init`). Start here.
- **[sieve-registry](https://github.com/khoitrn/sieve-registry)** — the Worker + D1 API this app is a UI on top of, and what step 1 above deploys your own copy of.
- **sieve-dashboard** (this repo) — the hosted UI. The maintainer's copy is at [sieve.khoitrn.com](https://sieve.khoitrn.com); see [Run your own copy](#run-your-own-copy-end-to-end) for yours.

## Stack

Next.js (App Router, static export) + TypeScript + Tailwind v4, deployed on
Cloudflare Pages. No database, no server-held sessions on this side — all
Library/Sources/Custom state lives in `sieve-registry`; Dashboard re-fetches
straight from GitHub's raw CDN with a 5-minute revalidation window. The one
exception is two small Cloudflare Pages Functions
(`functions/api/auth/callback/{github,gitlab}.ts`) that exist solely to
exchange an OAuth code for a token without exposing the client secret to
the browser; they hold no state and see nothing else.
