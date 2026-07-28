import { fetchRaw } from "./github";
import type { Bridge, HistoryEvent, RepoSnapshot, SieveIndex, SieveSkill } from "./types";

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
    };
  }

  const [indexRaw, historyRaw, progressRaw, bridgeScript, staleRaw, proposedRaw] = await Promise.all([
    fetchRaw(owner, repo, "sieve.index.json"),
    fetchRaw(owner, repo, "HISTORY.jsonl"),
    fetchRaw(owner, repo, "PROGRESS.md"),
    fetchRaw(owner, repo, "scripts/bridge.mjs"),
    fetchRaw(owner, repo, "STALE.md"),
    fetchRaw(owner, repo, "PROPOSED.md"),
  ]);

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
  };
}

/**
 * No per-skill usage telemetry exists in HISTORY.jsonl today — sieve only logs
 * catalog/protocol events, not "skill N fired in session M". Mention count in
 * the real log is the closest honest signal; it is not a usage count and is
 * labeled as such wherever it's shown.
 */
export function skillSignal(skill: SieveSkill, history: HistoryEvent[]) {
  const matches = history.filter((e) => JSON.stringify(e).includes(skill.name));
  const lastMention = matches.length
    ? matches.map((e) => e.ts).sort().at(-1) ?? null
    : null;
  return { mentionCount: matches.length, lastMention };
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
