# Database backup and restore

Pratiqo uses **Supabase (PostgreSQL)**. This repo includes PowerShell scripts to create **custom-format** backups (`.dump`) using **`pg_dump`** and restore with **`pg_restore`**.

## Prerequisites

1. **PostgreSQL client tools** installed on your machine (Windows: PostgreSQL installer includes `pg_dump` / `pg_restore`).
2. Add the client **`bin`** directory to your **`PATH`**, or rely on the script’s default search paths.

Example Windows PATH entry (adjust version if needed):

`C:\Program Files\PostgreSQL\18\bin`

## Configuration

Connection settings are read from **`.env.local`** at the repo root (see **`.env.example`** → *Supabase database backup / restore*):

- **`SUPABASE_HOST`** — hostname only (no `https://`)
- **`SUPABASE_PORT`**
- **`SUPABASE_USER`**
- **`SUPABASE_PASSWORD`**
- **`SUPABASE_DB`** — optional; defaults to `postgres` if omitted (or **`POSTGRES_DB`** as alternate key in scripts)

Never commit **`.env.local`** or passwords.

## Test connection

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Backup-Database.ps1" -TestConnection
```

## Run a backup

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Backup-Database.ps1"
```

Backups are written under **`backups/`** in the repo (e.g. `pratiqo-backup-YYYY-MM-dd-HH-mm.dump`). That directory is **gitignored** — do not commit backups.

## Restore (danger)

**Restore overwrites data** in the target database configured in `.env.local`. Only run when you intend to replace schema/data (e.g. disaster recovery or a dedicated clone).

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\Restore-Database.ps1" -BackupPath ".\backups\pratiqo-backup-YYYY-MM-dd-HH-mm.dump"
```

The script prompts for **`YES`** before proceeding.

## Good practices

1. **Never commit** `*.dump`, `*.sql.gz`, or `backups/` contents.
2. **Test restore on a separate database** (or Supabase branch / staging project) before touching production.
3. Prefer the **Session / Transaction pooler** host from the Supabase dashboard if direct `5432` is blocked; match the port shown there.

The shared helpers live in **`scripts/SupabaseDbConnection.ps1`** (including UTF-8 BOM handling when reading `.env.local`).
