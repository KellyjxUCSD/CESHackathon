# TritonRent deployment

## Current status (November 13, 2026)

- The app is one dependency-free Node server that serves `public/` and the `/api/*` routes. It is not a static-only site.
- `npm run check` and `npm test` pass locally (29 tests). The server uses `PORT` and binds to `0.0.0.0` by default.
- The local `.env` has a Maps key and is ignored by Git. The browser obtains this key from `/api/maps-key`, so it must be restricted in Google Cloud; putting it in a server environment variable alone does not make it secret.
- Calculator plans live in browser storage. Share links include a snapshot of resident names and costs. Floor-plan uploads remain in the current browser tab. There is no database or persistent server upload to migrate.
- Live rent and floor-plan images depend on third-party property websites. A source outage can make pricing unavailable even when TritonRent is healthy.
- Deployment has not been performed. The Google Cloud key restrictions, hosted map behavior, custom domain, and production smoke checks remain unverified.

## Recommended first deployment: Render web service

`render.yaml` defines a single Node web service. It runs checks and tests on build, starts with `npm start`, and health-checks `/`. Deploys are manual so in-progress work is not published on every commit. The file selects Render's free plan for a preview; free services sleep after inactivity and can take time to wake. Choose a paid web-service plan before relying on the site for a live event or public production traffic. See [Render's free-service limits](https://render.com/docs/free) and [Blueprint reference](https://render.com/docs/blueprint-spec).

### Before the first deploy

1. Finish and review the current work in progress. Commit `package.json`, `server/index.mjs`, and any other intended changes before deploying. Do not commit `.env`.
2. Push the reviewed commit to the branch to deploy. In Render, create a Blueprint from this repository's `render.yaml` and trigger the first deploy manually. Check that the build succeeds, the `/` health check passes, and the service receives an HTTPS `onrender.com` URL. The site can start without a Maps key.
3. In Google Cloud, enable billing and the **Maps JavaScript API**. Use a browser key restricted to **Websites** with the exact new Render hostname (and later the custom domain) as allowed HTTP referrers, and restrict the key to the Maps JavaScript API. Set an appropriate billing budget/alert. The key is exposed to the browser by design. See [Google's key guidance](https://developers.google.com/maps/api-security-best-practices).
4. Add `GOOGLE_MAPS_API_KEY` in the Render service's environment settings and redeploy. Do not paste the key into Git or the Blueprint file. Keep `autoDeployTrigger: off` until the team wants automatic releases.

### Smoke check on the deployed URL

- Open `/#/welcome`, `/#/explore`, and `/#/calculator` on desktop and mobile. Check that navigation and the apartment animation work.
- Confirm the Explore map loads without a Google authorization error. Search/filter apartments and open a listing. Confirm rent data appears when its source is available; verify the fallback state is understandable when it is not.
- Calculate a split with two residents, refresh, then open a share link in a private browser window. Check the values and names. Treat shared links as containing personal data.
- Upload one image or PDF floor plan, check its preview, and confirm the recognized dimensions can be corrected. Check that `/roommate-split/` redirects to the calculator.
- Confirm `.env` and repository files are not served (`/.env` should return 404). Check browser console and Render logs for errors. Run the check again after connecting a custom domain and adding that domain to the Google key's referrer list.

### Release and recovery

Use a reviewed commit for each manual deploy. Note its commit hash and test the hosted URL before sharing it. If a release fails, roll back to the previous deploy in Render and investigate logs. The app stores no server-side user data, so a redeploy does not require a database migration. However, browser-local plans and share links should remain compatible with the version you roll back to.
