"use client";

export type AuthProvider = "github" | "gitlab";

export interface AuthUser {
  provider: AuthProvider;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthSession {
  provider: AuthProvider;
  token: string;
}

const SESSION_KEY = "sieve-dashboard:auth";
const USER_KEY = "sieve-dashboard:auth-user";
const STATE_KEY = "sieve-dashboard:oauth-state";
const RETURN_KEY = "sieve-dashboard:oauth-return";

/**
 * client_id is not a secret — it's meant to be public and is baked into the
 * static build via NEXT_PUBLIC_*. The client_secret never reaches the
 * browser; only the Pages Function in functions/api/auth/callback/ sees it.
 */
const PROVIDER_CONFIG: Record<
  AuthProvider,
  { label: string; authorizeUrl: string; clientId: string | undefined; scope: string }
> = {
  github: {
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    scope: "repo read:user",
  },
  gitlab: {
    label: "GitLab",
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    clientId: process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID,
    scope: "read_repository read_user",
  },
};

export function providerLabel(provider: AuthProvider): string {
  return PROVIDER_CONFIG[provider].label;
}

export function isProviderConfigured(provider: AuthProvider): boolean {
  return Boolean(PROVIDER_CONFIG[provider].clientId);
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Kicks off the OAuth redirect. The state is stashed in sessionStorage (not
 * sent anywhere) so the callback page can confirm the browser that comes
 * back is the one that left, before it trusts the token in the URL.
 */
export function startLogin(provider: AuthProvider, returnTo: string) {
  const config = PROVIDER_CONFIG[provider];
  if (!config.clientId) {
    throw new Error(`${config.label} sign-in isn't configured (missing NEXT_PUBLIC_${provider.toUpperCase()}_CLIENT_ID)`);
  }
  const state = randomState();
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_KEY, returnTo);

  const redirectUri = `${window.location.origin}/api/auth/callback/${provider}`;
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  if (provider === "gitlab") url.searchParams.set("response_type", "code");

  window.location.href = url.toString();
}

/**
 * Called once by the /auth/callback page after the Pages Function hands
 * the token back in a URL fragment (never sent to any server, including
 * ours, past that one redirect). Returns the return-to path so the callback
 * page knows where to send the user next.
 */
export function completeLogin(hash: string): { returnTo: string; ok: boolean } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const returnTo = sessionStorage.getItem(RETURN_KEY) || "/";
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(RETURN_KEY);

  const token = params.get("token");
  const provider = params.get("provider") as AuthProvider | null;
  const state = params.get("state");

  if (!token || !provider || !state || state !== expectedState) {
    return { returnTo, ok: false };
  }

  const session: AuthSession = { provider, token };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(USER_KEY);
  return { returnTo, ok: true };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** Fetches the signed-in identity once and caches it; each provider has its own profile shape. */
export async function fetchAndCacheUser(session: AuthSession): Promise<AuthUser | null> {
  try {
    const user =
      session.provider === "github"
        ? await fetchGitHubUser(session.token)
        : await fetchGitLabUser(session.token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

async function fetchGitHubUser(token: string): Promise<AuthUser | null> {
  const res = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { login: string; name: string | null; avatar_url: string | null };
  return { provider: "github", login: data.login, name: data.name, avatarUrl: data.avatar_url };
}

async function fetchGitLabUser(token: string): Promise<AuthUser | null> {
  const res = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { username: string; name: string | null; avatar_url: string | null };
  return { provider: "gitlab", login: data.username, name: data.name, avatarUrl: data.avatar_url };
}
