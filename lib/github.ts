const RAW_BASE = "https://raw.githubusercontent.com";

/**
 * Fetches a file straight from a public repo's default branch via the raw CDN.
 * Deliberately avoids api.github.com — the raw CDN has no meaningful rate limit
 * for unauthenticated reads, which matters since this dashboard supports public
 * repos only (no GitHub auth / token in play).
 */
export async function fetchRaw(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const url = `${RAW_BASE}/${owner}/${repo}/HEAD/${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const [owner, repo] = parts;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  return { owner, repo };
}
