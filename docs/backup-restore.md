# Staging backup and restore rehearsal

## Scope

Back up the Render PostgreSQL 17 database `mini_erp_staging`, then restore to a **new local Docker database** named `mini_erp_restore`. This does not deploy the app, access Express/DBF, reset staging, or create a paid cloud resource.

The script only accepts an explicit `STAGING_DATABASE_URL` pointing to the external Render host and database `mini_erp_staging`. It does not load `.env` or fall back to the app's DATABASE_URL. External connections require TLS with certificate verification. Credentials are supplied temporarily through environment variables, not command arguments, backup files or source control.

## What it does

1. Build a local PostgreSQL 17 tool image with the trusted CA bundle.
2. Read the source review schedules and Prisma migration history with read-only connection options.
3. Run `pg_dump` in custom format to `.backups/staging-<timestamp>-<id>/staging.dump`.
4. Create a new uniquely named restore container and volume. No host ports are exposed, and the restore container has no external network. The restore target is fixed to this local container, never the source URL.
5. Run `pg_restore --exit-on-error --single-transaction --no-owner --no-acl` against the new empty database. No DROP, --clean or --create option is used.
6. Compare all ReviewSchedule rows and Prisma migration history with the source, then read the source again to check those observations remain unchanged. Concurrent writes cause a mismatch and require investigation rather than claiming a pass.
7. Record archive SHA-256, source/restored data fingerprints, comparison results, timestamps and local resource names in `report.json` beside the archive. Stop the restore container but retain its volume and archive for review.

The custom archive contains the database, not cluster-wide roles. Ownership and grants are deliberately not restored to the local rehearsal. This verifies restore execution plus the application tables used today; it does not validate every future table or prove full production recovery. No app credentials or Render environment configuration are backed up here.

## Run from PowerShell

Ensure Docker Desktop is running. On Render open the staging database → Connect → External and copy the External Database URL. Avoid saving or changing review dates until the command finishes.

```powershell
cd C:\Storage\Codex\mini-erp2

$backupSecret = Read-Host "Paste staging External Database URL" -AsSecureString
$previousStagingUrl = $env:STAGING_DATABASE_URL
try {
    $env:STAGING_DATABASE_URL = [System.Net.NetworkCredential]::new("", $backupSecret).Password
    node scripts/backup-restore-staging.mjs
}
finally {
    $env:STAGING_DATABASE_URL = $previousStagingUrl
    Remove-Variable backupSecret, previousStagingUrl
}
```

Expected report: `mode: render-staging-rehearsal`, `result: PASS`, both comparison flags true, and matching source/restored review dates (currently expected 2026-11-26). Share the report output, never the connection URL. If the script fails, report its stage and error; do not restore over staging to retry. Each rerun uses a new destination.

## Local self-test

```powershell
node scripts/backup-restore-staging.mjs --self-test
```

Creates a temporary isolated source with the project's ReviewSchedule migration and a small fixture migration-history table. Seeds 2026-11-26, dumps and restores through the same pipeline, then removes only that source fixture. Its report says `local-self-test`, which is **not evidence of a Render backup**. The restored local volume is retained just as for an actual run.

## Retention and cost

`.backups/` is excluded from Git and Docker build context. Backup archives are not encrypted by this script; keep them on a controlled local disk. This initial exercise produces a manual local backup, not scheduled or off-site backup coverage. A separate retention and storage plan is needed before real data.

No new paid Render service is created. Existing Render charges continue, and external backup traffic can count toward provider usage. Local archives and restore volumes use disk space. Resource names are unique and recorded in the report; review those exact names before any later cleanup. Do not use broad Docker prune commands.

Current status: actual Render staging backup and local restore rehearsal **passed** on 2026-11-11. The user ran the script with private connection details; the resulting local report and archive checksum were independently read and verified afterwards. No deployment or staging data write was performed.

## Actual staging rehearsal result

- Source: Render `mini_erp_staging`; destination: isolated local `mini_erp_restore`.
- Source observed at 2026-11-11 10:39:32.097221 UTC and again at 10:39:42.275173 UTC (17:39 Bangkok).
- Source and restored review dates: `VINYL-001` / `WH-01` / `2026-11-26`.
- One Prisma migration-history row matched; `sameRestoredData`, `sameSourceData`, and `sourceReadOnly` were all true.
- Source/restored state SHA-256: `b7d4752abd7dcd395eca8bb8f213557b6aef184d2321c879f389552ddc90eb8b`.
- Archive: `.backups/staging-2026-11-11T10-39-25-989Z-0893154b/staging.dump` (3872 bytes), with `report.json` beside it.
- Archive SHA-256 independently verified: `93da4c488860cbdf62dc2bfafe7e659a78fa09456dbadc60398468a9dbb3c3ea`.
- Restore container: `mini-erp2-restore-b5b447d3-db`; retained volume: `mini-erp2-restore-b5b447d3-data`.

The actual data restore was verified by SQL comparison, not by running the web app against the restored database. Scheduled backups, off-site storage and production recovery objectives remain separate follow-up work.

Local validation on 2026-11-11 passed with `mode: local-self-test`: source/restored date 2026-11-26, one migration-history fixture row, `sameRestoredData: true`, `sameSourceData: true`, and `sourceReadOnly: true`. Archive size 2983 bytes; SHA-256 `128bdeeb4cda66221bc7032876670c66b370861981d227f30c3ec708dde4b5a6`. Report is under `.backups/self-test-2026-11-11T10-37-47-426Z-6963aabc/report.json`. The original local demo app and database remained healthy. No live staging backup has been claimed from this local test.

References: [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).
