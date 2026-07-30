"use client";

import type { AuthSession } from "@/lib/auth";
import type { RegistryBundle, RegistrySkill, RegistrySource } from "@/lib/types";

// Overridable so self-hosting a registry stays possible — same pattern as
// sievekit's SIEVE_REGISTRY_URL env var on the CLI side.
const REGISTRY_URL = process.env.NEXT_PUBLIC_SIEVE_REGISTRY_URL ?? "https://sieve-registry.khoitrn.workers.dev";

export interface AddSourceResult {
  ok: boolean;
  id?: string;
  status?: "active" | "failed";
  upserted?: number;
  error?: string;
}

export interface MySkillInput {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  body: string;
  version?: string;
}

export interface MySkillResult {
  ok: boolean;
  error?: string;
  detail?: string;
}

function authHeaders(session: AuthSession | null): HeadersInit {
  // The registry only understands GitHub identity today (it resolves the
  // caller via api.github.com/user); a GitLab session has nothing to send,
  // same as an anonymous visitor — both just get the curated pool.
  if (!session || session.provider !== "github") return {};
  return { Authorization: `Bearer ${session.token}` };
}

export async function listSkills(session: AuthSession | null): Promise<RegistrySkill[]> {
  const res = await fetch(`${REGISTRY_URL}/api/skills`, { headers: authHeaders(session) });
  if (!res.ok) return [];
  return res.json();
}

// Curated only — no auth, same visibility as the curated skill catalog.
export async function listBundles(): Promise<RegistryBundle[]> {
  const res = await fetch(`${REGISTRY_URL}/api/bundles`);
  if (!res.ok) return [];
  return res.json();
}

export async function createMySkill(session: AuthSession, input: MySkillInput): Promise<MySkillResult> {
  const res = await fetch(`${REGISTRY_URL}/api/my-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(session) },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
  return { ok: res.ok, error: data.error, detail: data.detail };
}

export async function deleteMySkill(session: AuthSession, name: string): Promise<boolean> {
  const res = await fetch(`${REGISTRY_URL}/api/my-skills/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: authHeaders(session),
  });
  return res.ok;
}

export async function listSources(session: AuthSession): Promise<RegistrySource[]> {
  const res = await fetch(`${REGISTRY_URL}/api/sources`, { headers: authHeaders(session) });
  if (!res.ok) return [];
  return res.json();
}

export async function addSource(session: AuthSession, repoUrl: string): Promise<AddSourceResult> {
  const res = await fetch(`${REGISTRY_URL}/api/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(session) },
    body: JSON.stringify({ repoUrl }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `${res.status}` };
  }
  return res.json();
}

export async function deleteSource(session: AuthSession, id: string): Promise<boolean> {
  const res = await fetch(`${REGISTRY_URL}/api/sources/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(session),
  });
  return res.ok;
}
