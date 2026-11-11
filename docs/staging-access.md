# Staging access and rollback rehearsal

Staging URL: https://mini-erp2-staging.onrender.com

## Protection

The staging site uses HTTP Basic authentication over Render HTTPS. This is a shared staging gate, not the future individual Manager account system. Use a password manager to generate a random password of at least 20 characters (32 recommended); never reuse a personal password or commit the real credentials.

Set these variables on the **web service**, under Environment:

| Key | Value |
| --- | --- |
| STAGING_AUTH_MODE | on |
| STAGING_AUTH_USER | A chosen username without `:` (for example `manager`) |
| STAGING_AUTH_PASSWORD | Your randomly generated secret, at least 20 characters |

Keep DATABASE_URL unchanged. Select **Save only**, then manually deploy the protected commit after CI succeeds. Setting variables without deploying new code does not protect the old application.

All pages, detail pages, RSC requests, assets and POST requests pass the gate. The date-save Server Action also checks credentials before parsing or saving. Production defaults to requiring authentication. Missing configuration returns 503 rather than exposing the site. Render cannot disable protection through `STAGING_AUTH_MODE=off`.

Only GET/HEAD `/api/health` is public so Render can check database readiness. It returns status only and no customer or schedule data. A healthy health check alone does not establish that login works.

Local development remains open by default. The localhost-only Docker demo explicitly opts out with `STAGING_AUTH_MODE=off`. Browser tests explicitly enable protection with dedicated test credentials, including fresh browser contexts. The test password is public fixture data, not a staging password.

Basic authentication credentials can remain cached by the browser. Close all private windows and open a new private session to test anonymous access. This gate has no per-user roles, individual audit trail, MFA or login rate limiter; it is only for the mock-data staging phase. Establish application authentication before real data is introduced.

## Deployment acceptance

1. CI must pass for the selected protected commit. Keep Auto-Deploy Off.
2. Set the three variables privately in Render; do not paste secrets into chat or screenshots.
3. Manual Deploy → Deploy a specific commit (or latest commit if it is the intended version).
4. In a fresh private browser, the main page must ask for credentials. Cancelled or wrong credentials must not show the app. Direct `/outstanding` and `/orders/C001` links must be protected as well.
5. Correct credentials must show the mock totals 150 / 180 / 70. Save a review date and verify it after opening another authenticated browser session.
6. `/api/health` must return 200 with status ok without credentials. If the main page returns 503, check the username and password configuration; do not disable protection.

## Rollback rehearsal (after protected baseline is Live)

Do not roll back to the original unprotected release (`a25ec1e` or `30dd528`).

1. Record the successful protected deployment as baseline A: commit SHA, deployment ID, date and saved review date.
2. Prepare version B with only a small visible staging label change, retaining the same authentication implementation and database schema. Run CI, deploy B manually and verify the label.
3. Save a new review date while B is running and record it.
4. Use Render's Deploys history to roll back to **protected A**. Keep the credentials and DATABASE_URL consistent across A and B; Render may reuse environment values from the target deployment.
5. Verify the label is back to A, anonymous requests still return 401, authorized browsing works, health is 200 and the review date saved under B remains present.
6. Record actual outcomes before calling the rehearsal complete. No database reset or reverse migration is part of this rehearsal.

Status on 2026-11-11: the user reports successful access after deployment. An independent anonymous probe of the live main page returned 401 with the Basic challenge; `/api/health` returned 200 with status ok. Protected baseline A is commit `e7a19bc`; confirm its deployment entry in Render before rollback. Authenticated live contents and the current saved date were not independently read because staging credentials remain with the user.

Version B changes only the main-page mock-data label to `ข้อมูลสมมติสำหรับฝึกใช้งาน · รุ่นทดลอง B`. Authentication and database schema are unchanged. The local `secret/` directory is excluded from Git and Docker build context without reading its contents. After CI passes, deploy B manually, save a distinguishable review date (for example 2026-11-26), then roll back to the successful protected A deployment. The B label should disappear while the newly saved date remains. Do not change environment variables between the two deployments. Deployment B and the actual rollback remain pending user actions in Render.

Validation on 2026-11-10: initial acceptance suite failed because the guard did not yet exist; after implementation, 58 Vitest tests, TypeScript, production build and 25 browser tests passed on isolated Linux Docker. Browser checks include wrong/absent credentials and replay of a real save request without authorization, confirming the stored date does not change. The standalone runtime image separately returned 503 for missing configuration, 401 for anonymous access and 200 for an authorized detail page. No staging credentials or database contents were used by these tests.

References: [Render environment settings](https://render.com/docs/configure-environment-variables), [Render rollbacks](https://render.com/docs/rollbacks).
