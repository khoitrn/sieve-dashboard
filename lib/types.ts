export type SkillTier = "catalog" | "guardrail";

export interface SieveSkill {
  name: string;
  description: string;
  category: string;
  tier: SkillTier;
  version: string;
  last_reviewed: string;
  status: string;
}

export interface SieveIndex {
  name: string;
  version: string;
  skills: SieveSkill[];
}

export interface HistoryEvent {
  ts: string;
  repo: string;
  event: string;
  [key: string]: unknown;
}

export interface Bridge {
  agent: string;
  file: string;
}

export interface RepoSnapshot {
  owner: string;
  repo: string;
  connected: boolean;
  index: SieveIndex | null;
  history: HistoryEvent[];
  bridges: Bridge[];
  progressSummary: string | null;
}
