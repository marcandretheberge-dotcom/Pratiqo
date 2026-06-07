# Pratiqo Production Backups Runbook

Last reviewed: 2026-06-07

This runbook describes the backup and restore procedure for Pratiqo before Stripe production activation and public launch. It is operational documentation only. It does not contain secrets, database dumps, or production data.

## 1. Current Backup Setup

Current repository support:

- `scripts/Backup-Database.ps1` creates a Supabase Postgres custom-format backup using `pg_dump`.
- `scripts/Restore-Database.ps1` restores a `.dump` file using `pg_restore` and requires typing `YES`.
- `docs/backup-and-restore.md` documents local script usage.
- `.env.example` lists the Supabase database connection variables used by the scripts.
- `.gitignore` excludes `backups/`, `*.dump`, and `*.sql.gz`.

Current wiring:

- Database backup is manual/operator-run today.
- No Vercel Cron or GitHub Actions job currently runs database backups.
- No offsite private backup bucket is wired in code.
- The only scheduled production jobs currently visible in repo are booking completion via `vercel.json` and booking reminders via `.github/workflows/booking-reminders.yml`.

Launch decision:

- Do not rely only on local `backups/` files.
- Before public launch, configure a private offsite backup target outside the repo.
- Until offsite automation exists, run and verify a manual database backup before each major launch step.

## 2. Backup Scope

Back up:

- Supabase Postgres database, including public tables, auth-linked application records, booking/payment ledger rows, support cases, reviews, profiles, teachers, messages, and operational metadata.
- Supabase Storage buckets used for user uploads, especially:
  - `avatars` public-read bucket for profile images.
  - `teacher-diplomas` private bucket for diploma documents.
  - `yopratiqo-audio` public-read bucket if generated audio is stored there.
- Operational configuration inventory, kept in the password manager and Vercel/Supabase dashboards, not in the repo.

Do not back up locally in this repo:

- Stripe processor records. Stripe remains the system of record for charges, refunds, subscriptions, disputes, identity events, and webhook deliveries.
- Vercel environment variable values. Store them in Vercel and the password manager only.
- Supabase service role keys, Stripe keys, S3 credentials, database passwords, or production exports containing personal information.

## 3. Backup Schedule

Minimum launch schedule:

- Daily database backup: run every day after low-traffic hours.
- Manual database backup before Stripe live activation.
- Manual database backup before each major production release.
- Manual database backup before any destructive data operation, bulk import, or restore rehearsal.
- Storage backup: verify current bucket export/sync process before launch and after major media migration.

Retention target:

- Keep at least 7 daily backups.
- Keep at least 4 weekly backups.
- Keep at least 3 monthly backups during launch stabilization.
- Delete expired backups through a controlled retention process, not ad hoc local cleanup.

Storage target:

- Use a private backup bucket or managed backup store.
- Bucket must not be public.
- Access must be limited to named operators.
- Encryption at rest should be enabled by provider default or explicit setting.

## 4. Manual Database Backup Procedure

Preconditions:

- PostgreSQL client tools are installed.
- `.env.local` points to the intended Supabase project.
- `.env.local` is not committed.
- The operator has permission to read the production database.

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Backup-Database.ps1" -TestConnection
powershell -ExecutionPolicy Bypass -File ".\scripts\Backup-Database.ps1"
```

After backup:

- Confirm a new `.dump` file exists under `backups/`.
- Confirm file size is non-trivial and timestamp matches the operation.
- Upload or move the backup to the approved private backup location.
- Do not commit the backup file.
- Record the backup timestamp, operator, destination, and verification result in the launch log.

## 5. Storage Backup Procedure

Supabase Storage is not backed up by `pg_dump`. Before launch, document the chosen storage export method for each bucket.

Minimum checklist:

- List production buckets and visibility:
  - `avatars`: public read, user-scoped writes.
  - `teacher-diplomas`: private.
  - `yopratiqo-audio`: public read, service-role upload pipeline.
- Export or sync objects to a private destination.
- Preserve object paths.
- Confirm private destination is not browsable publicly.
- Confirm at least one sample object can be restored to staging.

Do not copy private diploma documents into the repository or local shared folders.

## 6. Restore Procedure

Restore is a production incident procedure. The default path is staging first.

1. Identify the incident and desired restore point.
2. Freeze risky writes if needed:
   - Pause marketing.
   - Disable checkout entry points if payment integrity is affected.
   - Keep group-session checkout disabled.
3. Select the backup:
   - Confirm timestamp.
   - Confirm source project.
   - Confirm file integrity and access permissions.
4. Restore to staging or a Supabase branch first.
5. Validate staging restore:
   - Login works.
   - Student and teacher dashboards load.
   - Search loads only public-safe teacher fields.
   - Bookings, booking payments, support cases, and messages are present.
   - RLS/security tests still pass against code.
   - Storage object references still resolve or are restored.
6. Decide whether production restore is required.
7. Approval before production restore:
   - Marc-Andre or designated operator approves.
   - If payment data is affected, reconcile with Stripe dashboard first.
8. Restore production only after validation and approval.
9. After restore:
   - Re-run smoke tests.
   - Review Stripe webhook deliveries since the restore point.
   - Reconcile any payment or booking records created after the backup timestamp.

PowerShell restore command:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Restore-Database.ps1" -BackupPath ".\backups\pratiqo-backup-YYYY-MM-dd-HH-mm.dump"
```

The script prompts for `YES`. Do not bypass the prompt.

## 7. Verification Checklist

Daily backup verification:

- Latest backup exists.
- Latest backup timestamp is within the expected schedule.
- Backup file is private.
- Backup file can be downloaded by an authorized operator.
- Backup file size is plausible compared with previous days.
- Backup job or manual run log is retained.
- Restore has been tested on a non-production environment within the last 30 days.

Pre-launch verification:

- Manual backup completed immediately before Stripe live activation.
- Manual backup completed immediately before public launch deployment.
- Storage bucket export/sync procedure has been tested.
- Password manager contains current Vercel, Supabase, Stripe, email, and backup-provider access records.

## 8. Failure Handling

Backup failed:

- Do not proceed with Stripe live activation or major release.
- Check database connectivity and credentials.
- Re-run `Backup-Database.ps1 -TestConnection`.
- Check Supabase status page.
- Escalate if backup cannot be produced within the launch window.

Restore failed:

- Stop and preserve logs.
- Do not retry against production until the failure reason is understood.
- Attempt restore against a clean staging target.
- Verify PostgreSQL client version compatibility.

Backup storage unavailable:

- Keep the local backup only as a temporary fallback.
- Move to an alternate private destination as soon as possible.
- Do not use public links or shared personal drives for private backups.

Suspected data corruption:

- Freeze writes if active corruption is ongoing.
- Identify last known-good backup.
- Compare affected tables in staging restore before production action.
- Reconcile payment records against Stripe before changing payment ledger rows.

Suspected unauthorized access:

- Rotate affected credentials.
- Revoke exposed tokens.
- Review Supabase, Vercel, Stripe, and backup-provider access logs.
- Preserve evidence and notify required stakeholders according to applicable law and policy.

## 9. Security Notes

- Never commit secrets, backups, `.dump`, `.sql.gz`, `.env.local`, service-role keys, Stripe keys, or S3 credentials.
- Use least-privilege credentials for backup storage.
- Private buckets only for backups.
- Restrict backup access to named operators.
- Rotate credentials if exposed.
- Do not send backups by email or chat.
- Treat backups as sensitive production personal information.

## 10. Follow-Up Work

Needed before launch if operational capacity allows:

- Choose and configure the private offsite backup provider.
- Add a monitored backup job outside this repo or through a properly protected scheduled worker.
- Add storage bucket export automation.
- Document restore rehearsal evidence after first staging restore.
