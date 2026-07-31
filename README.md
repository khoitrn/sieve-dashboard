# Sieve dashboard

![status](https://img.shields.io/badge/status-alpha-orange)
![stack](https://img.shields.io/badge/stack-Next.js%20%2B%20Cloudflare%20Pages-blue)
![data](https://img.shields.io/badge/database-none-lightgrey)

A free website at **[sieve.khoitrn.com](https://sieve.khoitrn.com)** for looking at [Sieve](https://github.com/khoitrn/sieve) skills without touching a terminal. Nothing to install and nothing to download — open the link, and everything is one click away in the navigation bar at the top of the page.

**Is this for me?** Yes, if you just want to *look* — browse what skills are out there, see if a project you follow uses Sieve, or connect your own repo/write your own skill without opening a code editor. You don't need to already use Sieve's `npx sievekit init` command for any of this; the two are independent. Signing in is only needed for the parts that remember something about you (see below) — you can look around the whole site signed out first.

Separate repo from `sievekit` on purpose: this is a hosted viewer and
authoring surface, not a feature of the npm package. No account, no
database on this side — identity and skill data live in
[`sieve-registry`](https://github.com/khoitrn/sieve-registry); this app is
the UI on top of it.

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

There's nothing to set up on your end beyond clicking that button — no account to create, no password, no email. Under the hood: no database on this side, the sign-in token stays only in your own browser's local storage, and it's never seen by a server except for the one moment it's first exchanged.

## Related projects

- **[sieve](https://github.com/khoitrn/sieve)** — the npm package (`npx sievekit init`). Start here.
- **[sieve-registry](https://github.com/khoitrn/sieve-registry)** — the Worker + D1 API this app is a UI on top of.
- **sieve-dashboard** (this repo) — the hosted UI, at [sieve.khoitrn.com](https://sieve.khoitrn.com).

---

Everything from here on is for people running their own copy of this site — you don't need any of it just to use [sieve.khoitrn.com](https://sieve.khoitrn.com).

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
