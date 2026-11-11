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

Version B (`ef836ba`) changes only the main-page mock-data label to `ข้อมูลสมมติสำหรับฝึกใช้งาน · รุ่นทดลอง B`. Authentication and database schema are unchanged. The local `secret/` directory is excluded from Git and Docker build context without reading its contents. Deployment B and the rollback to protected A were performed by the user in Render; the verified repeat rehearsal is recorded below.

## Actual rollback result — 2026-11-11

The first attempt was inconclusive: after rollback, the user observed 2026-11-25 and a direct database read confirmed 2026-11-25. Deploying B again still showed 2026-11-25. There was no direct database evidence of 2026-11-26 before that first rollback, so its cause remains unknown; do not attribute it to database rollback or data loss.

The repeat rehearsal established a direct database baseline before rollback:

| Check | Before rollback, version B | After rollback, version A |
| --- | --- | --- |
| Main-page label (user observed) | Includes รุ่นทดลอง B | No รุ่นทดลอง B |
| Saved date on page (user observed) | 26 Nov 2026 | 26 Nov 2026 |
| Database | mini_erp_staging | mini_erp_staging |
| SKU / internal warehouse key | VINYL-001 / WH-01 | VINYL-001 / WH-01 |
| review_date (user-run read-only query) | 2026-11-26 | 2026-11-26 |
| Query time UTC | 2026-11-11 10:11:39.302916+00 | 2026-11-11 10:14:08.438635+00 |

After the user supplied the final results, an independent anonymous probe returned HTTP 401 with the Basic challenge, and `/api/health` returned HTTP 200 with `{"status":"ok"}`. The authenticated page and SQL results above were supplied by the user; no staging password was shared. Deployment IDs were not independently inspected.

Outcome: the repeat application rollback rehearsal passed, with the newly saved review date preserved and anonymous access still blocked. No schema rollback, restore, migration or DBF connection was part of this rehearsal. This verifies application rollback with an unchanged schema, not recovery from destructive database migrations.

The diagnostic `scripts/read-staging-review-date.mjs` takes only an explicit `STAGING_DATABASE_URL`, requires verified TLS for the external Render connection, and reads the selected row in a read-only transaction. Its initial connection reset was followed by a successful read after explicit TLS was added. It does not print credentials or modify data.

Leave Auto-Deploy Off. After the rehearsal Render was serving A (`e7a19bc`). The post-rehearsal release removes B's label and includes the backup/restore tooling and evidence. Deploy that release only after its CI succeeds, then confirm the live commit in Render matches GitHub, authentication remains required and the date is still 2026-11-26. This follow-up deployment remains a user action; its result is not yet verified. No schema change, migration, credential change or database restore is needed.

Validation on 2026-11-10: initial acceptance suite failed because the guard did not yet exist; after implementation, 58 Vitest tests, TypeScript, production build and 25 browser tests passed on isolated Linux Docker. Browser checks include wrong/absent credentials and replay of a real save request without authorization, confirming the stored date does not change. The standalone runtime image separately returned 503 for missing configuration, 401 for anonymous access and 200 for an authorized detail page. No staging credentials or database contents were used by these tests.

References: [Render environment settings](https://render.com/docs/configure-environment-variables), [Render rollbacks](https://render.com/docs/rollbacks).
