// Minimal OAuth proxy for Decap CMS's GitHub backend.
//
// GitHub Pages serves the site itself, but the OAuth code-for-token
// exchange requires a client secret, which can't live in static JS.
// This Worker is the "server" that does just that exchange, for exactly
// two endpoints Decap's github backend expects: /auth and /callback.
//
// Required secrets (set with `wrangler secret put <NAME>`):
//   GITHUB_CLIENT_ID
//   GITHUB_CLIENT_SECRET

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      const redirectUri = `${url.origin}/callback`;
      const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
      authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
      authorizeUrl.searchParams.set('scope', 'repo,user');
      authorizeUrl.searchParams.set('state', crypto.randomUUID());
      return Response.redirect(authorizeUrl.toString(), 302);
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code parameter', { status: 400 });
      }

      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${url.origin}/callback`,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        return new Response(
          'GitHub OAuth error: ' + (tokenData.error_description || tokenData.error || 'unknown error'),
          { status: 400 }
        );
      }

      // Handshake + token delivery expected by Decap CMS's github backend:
      // the popup waits for the opener's ping before posting the token back.
      const message =
        'authorization:github:success:' + JSON.stringify({ token: tokenData.access_token, provider: 'github' });

      const html = `<!DOCTYPE html>
<html>
<body>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('Decap CMS GitHub OAuth provider. Endpoints: /auth, /callback', { status: 200 });
  },
};
