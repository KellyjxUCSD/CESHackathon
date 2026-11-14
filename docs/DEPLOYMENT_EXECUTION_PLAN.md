# TritonRent Render free preview: execution plan

## Objective and boundaries

Deploy the current TritonRent Node app as one Render **web service** on the free plan. Keep the existing browser calculator and server API together. Never commit or print `.env` or the Maps key. Do not enable automatic deployment while other work is in progress. Stop and hand off when the user's own Render or Google Cloud account action is required.

## State at start (2026-11-13)

- Branch: `main`; remote: `KellyjxUCSD/CESHackathon`.
- Cursor's pending code changes: `package.json` declares Node >=18; `server/index.mjs` listens on `HOST` or `0.0.0.0` and Render's `PORT`. Reviewed; both are needed for deployment.
- Preparation files: `render.yaml`, `.node-version`, `.env.example`, `docs/deployment.md`, and a README link. `render.yaml` uses `plan: free`, `healthCheckPath: /`, and `autoDeployTrigger: 'off'`.
- `npm run check` and `npm test` pass (29 tests). The Render Blueprint parses as YAML.
- The local `.env` contains a Maps key but is ignored by Git. Its Google Cloud restrictions are not verified.

## Phase 1 — Finish and commit local preparation

1. Recheck Git status and diff. If Cursor has added work since this plan was written, review it separately and do not include unrelated files in the deployment commit.
2. Run `npm run check`, `npm test`, `git diff --check`, and parse `render.yaml`.
3. Stage exactly: `README.md`, `package.json`, `server/index.mjs`, `.env.example`, `.node-version`, `render.yaml`, `docs/deployment.md`, and this plan. Confirm `.env` is not staged. Commit with a descriptive deployment-preparation message.
4. Compare local `main` with `origin/main` before pushing. Resolve divergence safely; never force-push. Push the reviewed commit so Render can read `render.yaml`.

## Phase 2 — Create the Render preview

1. In Render, connect the GitHub repository and create a Blueprint from the committed `render.yaml` on `main`.
2. Confirm the web service is **Free**, the build command is `npm run check && npm test`, the start command is `npm start`, the health path is `/`, and automatic deploys are **Off**. Do not accept a paid plan or add a payment method without the user's own decision.
3. Trigger the initial manual deploy. Record the service URL and deployed commit. Check build logs and the health result.
4. If Render login, repository authorization, billing, or another account-only step is required, stop and tell the user exactly what to do; resume after they finish it.

## Phase 3 — Google Maps

1. After Render assigns the hostname, create or edit a browser Maps key in Google Cloud. Enable Maps JavaScript API and any required billing. Restrict **application** to Websites with the exact Render HTTPS origin; restrict **API** to Maps JavaScript API. Add a custom domain only after it is connected. Set a billing alert/budget.
2. Set `GOOGLE_MAPS_API_KEY` in the Render service environment. Never put it in Git, chat, logs, or the Blueprint. Redeploy manually.
3. If Google Cloud login, billing, key creation/restrictions, or secret entry requires the user, stop and provide an exact handoff. The app can first deploy without a key; the map remains unverified until this phase is done.

## Phase 4 — Hosted smoke test and release

Follow `docs/deployment.md`: desktop and mobile Welcome/Explore/Calculator; map authorization; live-rent success and fallback; two-person calculation, refresh, and private-window share link; image/PDF floor plan; `/roommate-split/` redirect; `/.env` 404; browser console and Render logs. Note that live price sources may fail independently of the app. Share the URL only after these checks pass.

## Rollback

In Render, open the service's **Deploys** page, select a recent successful deployment, and choose **Rollback**. The free plan retains only a limited number of rollback targets. Recheck the hosted URL after rollback. The app has no server-side user database, but browser-local plans and share links should be checked for compatibility.

## Definition of done

The committed version is live at a Render HTTPS URL; health, map, and smoke checks pass; the exact deployed commit and URL are recorded; the user has any account/billing decisions documented. If a manual account action blocks progress, report completed phases and the next exact action instead of claiming deployment is finished.
