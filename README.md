# Sieve dashboard

A read-only website that shows whether a public GitHub repo is running the
[Sieve](https://github.com/khoitrn/sieve) protocol — its skill catalog, which
skills are guardrails vs. catalog, real mentions of each skill in the repo's
own `HISTORY.jsonl`, and the protocol's file-based architecture.

Separate repo from `sievekit` on purpose: this is a hosted viewer of repos,
not a feature of the npm package. Public repos only for now — no GitHub auth,
no accounts. Every load reads `AGENTS.md`, `sieve.index.json`,
`HISTORY.jsonl`, `PROGRESS.md`, and `scripts/bridge.mjs` straight from
`raw.githubusercontent.com` and renders what's actually there. A repo with no
`AGENTS.md` gets an honest empty state, never fabricated numbers. Anyone can
type their own `owner/repo` into the picker; repos you've viewed are
remembered in your browser's `localStorage` only, nothing is sent anywhere.

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

## Stack

Next.js (App Router) + TypeScript + Tailwind v4. No database — every request
re-fetches from GitHub's raw CDN with a 5-minute revalidation window.
