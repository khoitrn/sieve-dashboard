"use client";

import { useEffect, useState } from "react";
import "./dashboard.css";
import { AppHeader } from "@/components/AppHeader";
import { type AuthSession, getSession, providerLabel } from "@/lib/auth";
import { parseOwnerRepo } from "@/lib/github";
import { addSource, deleteSource, listSources } from "@/lib/sieve-registry";
import type { RegistrySource } from "@/lib/types";

export function SourcesView() {
  const [session] = useState<AuthSession | null>(() => getSession());
  const [sources, setSources] = useState<RegistrySource[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    listSources(session).then((result) => {
      if (!cancelled) setSources(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function refresh() {
    if (!session) return;
    setSources(await listSources(session));
  }

  async function onAdd() {
    if (!session || !query.trim()) return;
    const parsed = parseOwnerRepo(query);
    if (!parsed) {
      setError("Enter owner/repo or a github.com URL");
      return;
    }
    setError(null);
    setAdding(true);
    const result = await addSource(session, `${parsed.owner}/${parsed.repo}`);
    setAdding(false);
    if (!result.ok) {
      setError(result.error ?? "Could not add this source");
      return;
    }
    setQuery("");
    await refresh();
    if (result.status === "failed") {
      setError(`Added, but the first scan failed — no SKILL.md files found in ${parsed.owner}/${parsed.repo}?`);
    }
  }

  async function onRemove(id: string) {
    if (!session) return;
    setRemovingId(id);
    const ok = await deleteSource(session, id);
    setRemovingId(null);
    if (ok) await refresh();
  }

  const curated = sources?.filter((s) => s.kind === "curated") ?? [];
  const own = sources?.filter((s) => s.kind === "user") ?? [];

  return (
    <div className="app">
      <AppHeader active="sources" current="khoitrn/sieve" />
      <main>
        {!session ? (
          <section className="panel empty-state">
            <span className="empty-glyph">[ ]</span>
            <h2>Sign in to manage skill sources</h2>
            <p>
              Curated sources feed everyone&rsquo;s recommendations. Sources you connect here stay
              private to your own onboarding — never shared into what other people see. Sign in
              with GitHub from the menu above to get started.
            </p>
          </section>
        ) : (
          <>
            <section className="panel">
              <h2 className="panel-eyebrow">
                Curated <span className="count">&mdash; owner-approved, feed everyone&rsquo;s recommendations</span>
              </h2>
              <ul className="skill-rows">
                {curated.map((s) => (
                  <li key={s.id} className="skill-row source-row">
                    <div className="skill-name-block">
                      <span className="skill-name">{s.repo_url.replace(/^https?:\/\//, "")}</span>
                      <span className="skill-meta">
                        <span className="tier-chip catalog">{s.status}</span>
                        {s.last_synced_at ? `synced ${s.last_synced_at}` : "not yet synced"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel" style={{ marginTop: 16 }}>
              <h2 className="panel-eyebrow">
                Your sources{" "}
                <span className="count">
                  &mdash; connected as {session.provider === "github" ? providerLabel("github") : "GitLab"}, visible
                  only to you
                </span>
              </h2>

              <div className="lib-toolbar" style={{ marginBottom: own.length ? 16 : 0 }}>
                <input
                  type="text"
                  className="lib-search mono"
                  placeholder="owner/repo or github.com/owner/repo"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && onAdd()}
                  aria-label="Add a skill source"
                />
                <button type="button" className="repo-search-go" onClick={onAdd} disabled={adding || !query.trim()}>
                  {adding ? "Scanning…" : "Add"}
                </button>
              </div>
              {error && (
                <p className="repo-error" role="alert">
                  {error}
                </p>
              )}

              {own.length === 0 ? (
                <p className="skill-detail-empty">
                  No sources connected yet. Add any public repo with <code className="mono">SKILL.md</code> files —
                  they&rsquo;ll be scanned and included in your own onboarding recommendations, forced to catalog
                  tier regardless of what they claim.
                </p>
              ) : (
                <ul className="skill-rows">
                  {own.map((s) => (
                    <li key={s.id} className="skill-row source-row">
                      <div className="skill-name-block">
                        <span className="skill-name">{s.repo_url.replace(/^https?:\/\//, "")}</span>
                        <span className="skill-meta">
                          <span className={`tier-chip ${s.status === "active" ? "catalog" : "guardrail"}`}>
                            {s.status}
                          </span>
                          {s.last_synced_at ? `synced ${s.last_synced_at}` : "not yet synced"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="source-remove"
                        onClick={() => onRemove(s.id)}
                        disabled={removingId === s.id}
                        aria-label={`Remove ${s.repo_url}`}
                      >
                        {removingId === s.id ? "Removing…" : "Remove"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
