import { categoryBreakdown } from "@/lib/sieve-repo";
import type { Bridge, FileStatus, SieveSkill } from "@/lib/types";

export function ArchitecturePanel({
  owner,
  repo,
  bridges,
  files,
  skills,
}: {
  owner: string;
  repo: string;
  bridges: Bridge[];
  files: FileStatus[];
  skills: SieveSkill[];
}) {
  const categories = categoryBreakdown(skills);
  const presentCount = files.filter((f) => f.present).length;

  return (
    <section className="panel">
      <h2 className="panel-eyebrow">
        Architecture{" "}
        <span className="count">
          &mdash; {presentCount}/{files.length} protocol files present in {owner}/{repo}
        </span>
      </h2>

      <ul className="file-map">
        {files.map((f) => (
          <li key={f.key} className={f.present ? "present" : "missing"}>
            <span className={`dot ${f.present ? "good" : "dim"}`} aria-hidden="true" />
            <span className="file-map-path mono">{f.path}</span>
            <span className="file-map-label">{f.label}</span>
            <span className="file-map-status">{f.present ? "present" : "missing"}</span>
          </li>
        ))}
      </ul>

      <h3 className="panel-subhead">
        Catalog shape <span className="count">&mdash; {skills.length} skills by category</span>
      </h3>
      {categories.length === 0 ? (
        <p className="skill-detail-empty">No sieve.index.json skills to break down.</p>
      ) : (
        <ul className="category-rows">
          {categories.map((c) => (
            <li key={c.category} className={`category-row cat-${c.category}`}>
              <span className="category-name">{c.category}</span>
              <div className="category-bar">
                <span
                  className="category-bar-catalog"
                  style={{ width: `${(c.catalog / c.total) * 100}%` }}
                />
                <span
                  className="category-bar-guardrail"
                  style={{ width: `${(c.guardrail / c.total) * 100}%` }}
                />
              </div>
              <span className="category-count mono">
                {c.catalog} catalog{c.guardrail > 0 ? ` · ${c.guardrail} guardrail` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="agent-badges">
        <span className="agent-badges-title">Agent bridges</span>
        {bridges.map((b) => (
          <span key={b.agent} className={`badge${b.active ? " on" : ""}`} title={b.file}>
            <span className={`dot ${b.active ? "good" : "dim"}`} aria-hidden="true" />
            {b.agent}
            <span className="sr-only">{b.active ? ", active" : ", not active"}</span>
          </span>
        ))}
        {bridges.length === 0 && <span className="badge">no bridge.mjs found</span>}
      </div>
    </section>
  );
}
