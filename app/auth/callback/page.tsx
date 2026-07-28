"use client";

import { useEffect, useState } from "react";
import { completeLogin, fetchAndCacheUser, getSession } from "@/lib/auth";

interface CallbackResult {
  error: string | null;
  returnTo: string;
}

/**
 * Runs once, synchronously, as the lazy initial state below — not from an
 * effect — so there's no setState-after-mount render cascade. completeLogin
 * itself only touches sessionStorage/localStorage, no network.
 */
function resolveCallback(): CallbackResult {
  if (typeof window === "undefined") return { error: null, returnTo: "/" };
  const hash = window.location.hash;
  if (hash.includes("error=")) {
    return { error: new URLSearchParams(hash.replace(/^#/, "")).get("error"), returnTo: "/" };
  }
  const { returnTo, ok } = completeLogin(hash);
  return { error: ok ? null : "state_mismatch", returnTo };
}

export default function AuthCallbackPage() {
  const [result] = useState<CallbackResult>(resolveCallback);

  useEffect(() => {
    if (result.error) return;
    const session = getSession();
    (session ? fetchAndCacheUser(session) : Promise.resolve(null)).finally(() => {
      window.location.replace(result.returnTo);
    });
  }, [result]);

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: "0 24px", fontSize: 13.5, color: "var(--ink-dim)" }}>
      {result.error ? (
        <p>
          Sign-in failed (<code className="mono">{result.error}</code>). You can close this and try again from the
          picker.
        </p>
      ) : (
        <p>Signing you in&hellip;</p>
      )}
    </div>
  );
}
