import { fetchRaw } from "./github";
import type { Bridge, HistoryEvent, RepoSnapshot, SieveIndex, SieveSkill } from "./types";

function parseBridges(source: string): Bridge[] {
  const bridges: Bridge[] = [];
  const re = /agent:\s*"([^"]+)"[\s\S]*?file:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    bridges.push({ agent: m[1], file: m[2] });
  }
  return bridges;
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
    };
  }

  const [indexRaw, historyRaw, progressRaw, bridgeScript] = await Promise.all([
    fetchRaw(owner, repo, "sieve.index.json"),
    fetchRaw(owner, repo, "HISTORY.jsonl"),
    fetchRaw(owner, repo, "PROGRESS.md"),
    fetchRaw(owner, repo, "scripts/bridge.mjs"),
  ]);

  let index: SieveIndex | null = null;
  if (indexRaw) {
    try {
      index = JSON.parse(indexRaw) as SieveIndex;
    } catch {
      index = null;
    }
  }

  return {
    owner,
    repo,
    connected: true,
    index,
    history: historyRaw ? parseHistory(historyRaw) : [],
    bridges: bridgeScript ? parseBridges(bridgeScript) : [],
    progressSummary: progressRaw ? extractCurrentPhase(progressRaw) : null,
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
