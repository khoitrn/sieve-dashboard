"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AuthProvider,
  type AuthUser,
  fetchAndCacheUser,
  getCachedUser,
  getSession,
  isProviderConfigured,
  logout,
  providerLabel,
  startLogin,
} from "@/lib/auth";

const PROVIDERS: AuthProvider[] = ["github", "gitlab"];

export function AuthMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getSession();
    if (session && !user) {
      fetchAndCacheUser(session).then((u) => u && setUser(u));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function signIn(provider: AuthProvider) {
    if (!isProviderConfigured(provider)) return;
    startLogin(provider, `${window.location.pathname}${window.location.search}`);
  }

  function signOut() {
    logout();
    setUser(null);
    setOpen(false);
  }

  return (
    <div className="auth-menu" ref={rootRef}>
      <button
        type="button"
        className="auth-trigger mono"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {user ? (
          <>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="auth-avatar" src={user.avatarUrl} alt="" width={18} height={18} />
            ) : (
              <span className="auth-avatar auth-avatar-placeholder" aria-hidden="true" />
            )}
            <span>{user.login}</span>
          </>
        ) : (
          <span>Sign in</span>
        )}
        <svg className="chev" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="auth-dropdown">
          {user ? (
            <>
              <p className="auth-dropdown-label">
                Signed in via {providerLabel(user.provider)} &middot; token kept in this browser only
              </p>
              <button type="button" className="auth-dropdown-item" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="auth-dropdown-label">Sign in to read private repos &amp; raise rate limits</p>
              {PROVIDERS.map((provider) => {
                const configured = isProviderConfigured(provider);
                return (
                  <button
                    key={provider}
                    type="button"
                    className="auth-dropdown-item"
                    disabled={!configured}
                    onClick={() => signIn(provider)}
                    title={configured ? undefined : `${providerLabel(provider)} sign-in isn't configured yet`}
                  >
                    Continue with {providerLabel(provider)}
                    {!configured && <span className="dim"> &mdash; not configured</span>}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
