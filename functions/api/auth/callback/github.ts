interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

/**
 * The only step that needs a server: exchanging an OAuth code for a token
 * requires the client_secret, which must never reach the browser. Everything
 * else about this app is static. The token is handed back in a URL fragment
 * (never sent to, or logged by, any server past this redirect) so the
 * client is the only place it's ever stored — no session, no cookie, no
 * database here.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const origin = url.origin;

  if (!code) {
    return Response.redirect(`${origin}/auth/callback#error=missing_code`, 302);
  }

  const redirectUri = `${origin}/api/auth/callback/github`;
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: context.env.GITHUB_CLIENT_ID,
      client_secret: context.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${origin}/auth/callback#error=token_exchange_failed`, 302);
  }

  const data = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    return Response.redirect(`${origin}/auth/callback#error=${encodeURIComponent(data.error ?? "no_token")}`, 302);
  }

  const fragment = new URLSearchParams({ provider: "github", token: data.access_token, state });
  return Response.redirect(`${origin}/auth/callback#${fragment.toString()}`, 302);
};
