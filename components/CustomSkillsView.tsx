"use client";

import { useEffect, useState } from "react";
import "./dashboard.css";
import { AppHeader } from "@/components/AppHeader";
import { type AuthSession, type AuthUser, fetchAndCacheUser, getCachedUser, getSession } from "@/lib/auth";
import { stripFrontmatter } from "@/lib/sieve-repo";
import { createMySkill, deleteMySkill, listSkills } from "@/lib/sieve-registry";
import type { RegistrySkill } from "@/lib/types";

const EMPTY_FORM = { name: "", description: "", category: "", tags: "", body: "" };

export function CustomSkillsView() {
  const [session] = useState<AuthSession | null>(() => getSession());
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser());
  const [skills, setSkills] = useState<RegistrySkill[] | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingName, setRemovingName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!session || user) return;
    let cancelled = false;
    fetchAndCacheUser(session).then((u) => {
      if (!cancelled && u) setUser(u);
    });
    return () => {
      cancelled = true;
    };
  }, [session, user]);

  async function refresh() {
    if (!session) return;
    setSkills(await listSkills(session));
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    listSkills(session).then((result) => {
      if (!cancelled) setSkills(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const sourceId = user ? `custom:${user.login}` : null;
  const mine = (skills ?? []).filter((s) => s.source_id === sourceId);

  async function onSave() {
    if (!session) return;
    if (!form.name.trim() || !form.description.trim() || !form.body.trim()) {
      setError("Name, description, and instructions are all required");
      return;
    }
    setError(null);
    setSaving(true);
    const result = await createMySkill(session, {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      body: form.body,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.detail ?? result.error ?? "Could not save this skill");
      return;
    }
    setForm(EMPTY_FORM);
    await refresh();
  }

  function edit(skill: RegistrySkill) {
    setForm({
      name: skill.name,
      description: skill.description,
      category: skill.category === "personal" ? "" : skill.category,
      tags: skill.tags.join(", "),
      body: stripFrontmatter(skill.body),
    });
    setExpanded(null);
    setError(null);
  }

  async function onDelete(name: string) {
    if (!session) return;
    setRemovingName(name);
    const ok = await deleteMySkill(session, name);
    setRemovingName(null);
    if (ok) await refresh();
  }

  return (
    <div className="app">
      <AppHeader active="custom" />
      <main>
        {!session ? (
          <section className="panel empty-state">
            <span className="empty-glyph">[ ]</span>
            <h2>Sign in to create your own skills</h2>
            <p>
              Custom skills are yours alone — scoped to your GitHub account, not any particular repo. They show up in
              your Library and your onboarding recommendations, never anyone else&rsquo;s. Sign in with GitHub from the
              menu above to get started.
            </p>
          </section>
        ) : (
          <>
            <section className="panel">
              <h2 className="panel-eyebrow">
                Write a skill <span className="count">&mdash; portable instructions an agent reads, same shape as a SKILL.md</span>
              </h2>

              <div className="custom-skill-form">
                <input
                  type="text"
                  className="lib-search mono"
                  placeholder="skill-name (lowercase, hyphens)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  type="text"
                  className="lib-search"
                  placeholder="One-line description — also the trigger for when to use it"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="custom-skill-row2">
                  <input
                    type="text"
                    className="lib-search mono"
                    placeholder="category (optional, default: personal)"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  <input
                    type="text"
                    className="lib-search mono"
                    placeholder="tags, comma, separated"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
                <textarea
                  className="custom-skill-textarea mono"
                  placeholder="Instructions the agent should follow…"
                  rows={10}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
                <div className="custom-skill-actions">
                  <button type="button" className="repo-search-go" onClick={onSave} disabled={saving}>
                    {saving ? "Saving…" : "Save skill"}
                  </button>
                  {form !== EMPTY_FORM && (
                    <button type="button" className="source-remove" onClick={() => setForm(EMPTY_FORM)}>
                      Clear
                    </button>
                  )}
                </div>
                {error && (
                  <p className="repo-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </section>

            <section className="panel" style={{ marginTop: 16 }}>
              <h2 className="panel-eyebrow">
                Your skills <span className="count">&mdash; visible only to you, catalog tier</span>
              </h2>
              {mine.length === 0 ? (
                <p className="skill-detail-empty">Nothing yet — write your first skill above.</p>
              ) : (
                <ul className="skill-rows">
                  {mine.map((skill) => {
                    const isOpen = expanded === skill.name;
                    return (
                      <li key={skill.name} className="skill-row">
                        <button
                          type="button"
                          className="skill-row-toggle lib-row-toggle"
                          aria-expanded={isOpen}
                          onClick={() => setExpanded(isOpen ? null : skill.name)}
                        >
                          <div className="lib-row-head">
                            <div className="skill-name-block">
                              <span className="skill-name">{skill.name}</span>
                              <span className="skill-meta">
                                <span className="tier-chip catalog">{skill.category}</span>
                              </span>
                            </div>
                          </div>
                          <p className="lib-description">{skill.description}</p>
                        </button>
                        {isOpen && (
                          <div className="skill-detail">
                            <pre className="skill-body mono">{stripFrontmatter(skill.body)}</pre>
                          </div>
                        )}
                        <div className="custom-skill-actions" style={{ padding: "0 8px 10px" }}>
                          <button type="button" className="source-remove" onClick={() => edit(skill)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="source-remove"
                            onClick={() => onDelete(skill.name)}
                            disabled={removingName === skill.name}
                          >
                            {removingName === skill.name ? "Removing…" : "Remove"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
