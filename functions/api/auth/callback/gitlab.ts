interface Env {
  GITLAB_CLIENT_ID: string;
  GITLAB_CLIENT_SECRET: string;
}

/** Same shape as the GitHub callback — see functions/api/auth/callback/github.ts for the rationale. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const origin = url.origin;

  if (!code) {
    return Response.redirect(`${origin}/auth/callback#error=missing_code`, 302);
  }

  const redirectUri = `${origin}/api/auth/callback/gitlab`;
  const tokenRes = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: context.env.GITLAB_CLIENT_ID,
      client_secret: context.env.GITLAB_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
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

  const fragment = new URLSearchParams({ provider: "gitlab", token: data.access_token, state });
  return Response.redirect(`${origin}/auth/callback#${fragment.toString()}`, 302);
};
