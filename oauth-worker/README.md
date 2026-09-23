# CMS OAuth proxy

Lets the `/admin` editor (Decap CMS) log in with GitHub and commit content
changes to this repo. GitHub Pages can't run this itself — it needs a
client secret, which only this small server-side Worker holds.

## One-time setup

1. **Create a GitHub OAuth App**
   GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `https://a1detailer.com`
   - Authorization callback URL: `https://<your-worker-subdomain>.workers.dev/callback`
     (you'll get the exact `workers.dev` URL after the first deploy below —
     you can update the callback URL afterward)
   - Save the **Client ID** and **Client Secret** it gives you.

2. **Deploy the Worker**
   ```bash
   cd oauth-worker
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```
   Note the `*.workers.dev` URL `wrangler deploy` prints out.

3. **Wire the URL into the CMS config**
   In `admin/config.yml`, set `backend.base_url` to that Worker URL, e.g.
   ```yaml
   base_url: https://a1detailer-cms-auth.your-subdomain.workers.dev
   ```
   Commit and push — GitHub Pages will pick it up automatically.

4. **Give your client access**
   Decap's GitHub backend logs in with a real GitHub account that has
   push access to `A1Detailer/website`. Add your client (or a dedicated
   account for them) as a repo collaborator: repo → Settings → Collaborators.

## Using it

Visit `https://a1detailer.com/admin/`, sign in with GitHub, edit content,
click Publish. That commits directly to `content/home.json` on `main`;
GitHub Pages rebuilds the live site within about a minute.
