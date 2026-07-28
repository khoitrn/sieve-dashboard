import { fetchRaw } from "./github";
import type { Bridge, FileStatus, HistoryEvent, RepoSnapshot, SieveIndex, SieveSkill } from "./types";

const PROTOCOL_FILES: { key: string; path: string; label: string }[] = [
  { key: "agentsMd", path: "AGENTS.md", label: "Protocol, single source of truth" },
  { key: "index", path: "sieve.index.json", label: "Skill catalog manifest" },
  { key: "progressMd", path: "PROGRESS.md", label: "Continuity: phase, decisions" },
  { key: "historyJsonl", path: "HISTORY.jsonl", label: "Append-only event log" },
  { key: "proposedMd", path: "PROPOSED.md", label: "Growth loop: gaps found in use" },
  { key: "staleMd", path: "STALE.md", label: "Growth loop: skills flagged wrong" },
  { key: "staging", path: "staging/README.md", label: "Contribution lane before promotion" },
  { key: "bridgeScript", path: "scripts/bridge.mjs", label: "Writes per-agent pointer files" },
];

interface BridgeDef {
  agent: string;
  file: string;
}

function parseBridgeDefs(source: string): BridgeDef[] {
  const defs: BridgeDef[] = [];
  const re = /agent:\s*"([^"]+)"[\s\S]*?file:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    defs.push({ agent: m[1], file: m[2] });
  }
  return defs;
}

function parseHistory(source: string): HistoryEvent[] {
  return source
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as HistoryEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is HistoryEvent => e !== null);
}

function extractCurrentPhase(progress: string): string | null {
  const match = progress.match(/##\s*Current phase\s*\n+([\s\S]*?)(\n##|$)/);
  return match ? match[1].trim() : null;
}

/**
 * STALE.md / PROPOSED.md ship with a single "- <placeholder> | ..." format
 * line and no real entries. Count only lines that look like actual entries
 * (start with "- " and don't contain a "<...>" placeholder token).
 */
function countEntries(source: string | null): number {
  if (!source) return 0;
  return source
    .split("\n")
    .filter((l) => /^-\s/.test(l.trim()) && !l.includes("<"))
    .length;
}

export async function getRepoSnapshot(owner: string, repo: string): Promise<RepoSnapshot> {
  const agentsMd = await fetchRaw(owner, repo, "AGENTS.md");

  if (!agentsMd) {
    return {
      owner,
      repo,
      connected: false,
      index: null,
      history: [],
      bridges: [],
      progressSummary: null,
      staleCount: 0,
      proposedCount: 0,
      files: PROTOCOL_FILES.map((f) => ({ ...f, present: false })),
    };
  }

  const [indexRaw, historyRaw, progressRaw, bridgeScript, staleRaw, proposedRaw, stagingRaw] = await Promise.all([
    fetchRaw(owner, repo, "sieve.index.json"),
    fetchRaw(owner, repo, "HISTORY.jsonl"),
    fetchRaw(owner, repo, "PROGRESS.md"),
    fetchRaw(owner, repo, "scripts/bridge.mjs"),
    fetchRaw(owner, repo, "STALE.md"),
    fetchRaw(owner, repo, "PROPOSED.md"),
    fetchRaw(owner, repo, "staging/README.md"),
  ]);

  const rawByKey: Record<string, string | null> = {
    agentsMd,
    index: indexRaw,
    historyJsonl: historyRaw,
    progressMd: progressRaw,
    bridgeScript,
    staleMd: staleRaw,
    proposedMd: proposedRaw,
    staging: stagingRaw,
  };
  const files: FileStatus[] = PROTOCOL_FILES.map((f) => ({ ...f, present: rawByKey[f.key] !== null }));

  let index: SieveIndex | null = null;
  if (indexRaw) {
    try {
      index = JSON.parse(indexRaw) as SieveIndex;
    } catch {
      index = null;
    }
  }

  const bridgeDefs = bridgeScript ? parseBridgeDefs(bridgeScript) : [];
  const bridges: Bridge[] = await Promise.all(
    bridgeDefs.map(async (def) => ({
      ...def,
      active: (await fetchRaw(owner, repo, def.file)) !== null,
    }))
  );

  return {
    owner,
    repo,
    connected: true,
    index,
    history: historyRaw ? parseHistory(historyRaw) : [],
    bridges,
    progressSummary: progressRaw ? extractCurrentPhase(progressRaw) : null,
    staleCount: countEntries(staleRaw),
    proposedCount: countEntries(proposedRaw),
    files,
  };
}

/**
 * No per-skill usage telemetry exists in HISTORY.jsonl today — sieve only logs
 * catalog/protocol events, not "skill N fired in session M". A real mention in
 * the log is the closest honest signal; it is not a usage count. Returned
 * oldest first so callers can bucket a trend or just take the last one.
 */
export function skillMatches(skill: SieveSkill, history: HistoryEvent[]): HistoryEvent[] {
  return history
    .filter((e) => JSON.stringify(e).includes(skill.name))
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

/** Roll skills up by category: total count and the catalog/guardrail split. */
export function categoryBreakdown(
  skills: SieveSkill[]
): { category: string; total: number; catalog: number; guardrail: number }[] {
  const byCategory = new Map<string, { catalog: number; guardrail: number }>();
  for (const s of skills) {
    const entry = byCategory.get(s.category) ?? { catalog: 0, guardrail: 0 };
    if (s.tier === "guardrail") entry.guardrail++;
    else entry.catalog++;
    byCategory.set(s.category, entry);
  }
  return Array.from(byCategory, ([category, { catalog, guardrail }]) => ({
    category,
    total: catalog + guardrail,
    catalog,
    guardrail,
  })).sort((a, b) => b.total - a.total);
}

/**
 * Polling only needs HISTORY.jsonl, not the full snapshot (index, bridges,
 * PROGRESS.md, etc). Returns null if the repo has gone away between polls;
 * callers should treat that as "no change" rather than a hard failure.
 */
export async function fetchHistory(owner: string, repo: string): Promise<HistoryEvent[] | null> {
  const raw = await fetchRaw(owner, repo, "HISTORY.jsonl");
  if (raw === null) return null;
  return parseHistory(raw);
}

/**
 * Polling only needs sieve.index.json, not the full snapshot. Returns null if
 * the file is missing or unparsable so callers can tell "nothing changed"
 * apart from "the catalog just disappeared or broke."
 */
export async function fetchIndex(owner: string, repo: string): Promise<SieveIndex | null> {
  const raw = await fetchRaw(owner, repo, "sieve.index.json");
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SieveIndex;
  } catch {
    return null;
  }
}

/**
 * A skill's frontmatter (name, triggers, tags, version) is metadata already
 * shown elsewhere. The body is the actual portable instructions an agent
 * reads — that's the part worth proving is real, vendor-neutral prose.
 */
function stripFrontmatter(source: string): string {
  if (!source.startsWith("---")) return source.trim();
  const end = source.indexOf("\n---", 3);
  if (end === -1) return source.trim();
  return source.slice(end + 4).trim();
}

/**
 * Fetched lazily, only when a visitor actually expands a skill row — not
 * eagerly for the whole catalog on page load.
 */
export async function fetchSkillBody(owner: string, repo: string, skill: SieveSkill): Promise<string | null> {
  if (!skill.url) return null;
  const raw = await fetchRaw(owner, repo, skill.url);
  if (raw === null) return null;
  return stripFrontmatter(raw);
}

/** One count per day for the trailing `days` days, oldest first, today last. */
export function bucketByDay(history: HistoryEvent[], days: number): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of history) {
    const day = e.ts?.slice(0, 10);
    if (day && buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return Array.from(buckets, ([date, count]) => ({ date, count }));
}
