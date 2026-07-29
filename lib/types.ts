export type SkillTier = "catalog" | "guardrail";

export interface SieveSkill {
  name: string;
  description: string;
  category: string;
  tier: SkillTier;
  version: string;
  last_reviewed: string;
  status: string;
  url?: string;
  tags?: string[];
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
  active: boolean;
}

export interface FileStatus {
  key: string;
  path: string;
  label: string;
  present: boolean;
}

export interface RegistrySkill {
  source_id: string;
  name: string;
  category: string;
  tier: SkillTier;
  description: string;
  tags: string[];
  version: string;
  last_reviewed: string;
  body: string;
  updated_at: string;
}

export interface RegistrySource {
  id: string;
  repo_url: string;
  kind: "curated" | "user";
  added_by: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface RepoSnapshot {
  owner: string;
  repo: string;
  connected: boolean;
  index: SieveIndex | null;
  history: HistoryEvent[];
  bridges: Bridge[];
  progressSummary: string | null;
  staleCount: number;
  proposedCount: number;
  files: FileStatus[];
}
