#Requires -Version 5.1
<#
.SYNOPSIS
  Restores a Pratiqo database from a pg_dump custom-format (.dump) backup.

  WARNING: This can replace schema/data in the target database. Confirms before running.
  Reads connection settings from .env.local. Never prints the password.
.PARAMETER BackupPath
  Full path to the backup file created by Backup-Database.ps1 (pg_dump -Fc).
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$BackupPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectRoot ".env.local"
$CommonPath = Join-Path $ScriptDir "SupabaseDbConnection.ps1"
. $CommonPath

function Get-PgRestoreExecutable {
  $candidates = @(
    (Get-Command "pg_restore.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
    "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe"
  )
  foreach ($p in $candidates) {
    if ([string]::IsNullOrWhiteSpace($p)) { continue }
    if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).Path }
  }
  throw "pg_restore.exe not found. Install PostgreSQL client tools or add pg_restore to PATH."
}

$resolvedBackup = Resolve-Path -LiteralPath $BackupPath -ErrorAction Stop

$envMap = Read-DotEnvLocal -Path $EnvFile

$required = @("SUPABASE_HOST", "SUPABASE_USER", "SUPABASE_PASSWORD", "SUPABASE_PORT")
foreach ($k in $required) {
  if (-not $envMap.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($envMap[$k])) {
    throw "Missing or empty required key in .env.local: $k"
  }
}

try {
  Assert-SupabaseHostFormat -HostValue $envMap["SUPABASE_HOST"]
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-SupabaseConnectionHelp
  exit 1
}

$pgHost = $envMap["SUPABASE_HOST"].Trim()
$pgUser = $envMap["SUPABASE_USER"].Trim()
$pgPassword = $envMap["SUPABASE_PASSWORD"]
$pgPort = $envMap["SUPABASE_PORT"].Trim()
$pgDb = Get-PgDatabaseNameFromMap -EnvMap $envMap

Write-Host "Backup file: $($resolvedBackup.Path)"
Write-Host ""
Write-Host "This will restore into the database configured in .env.local (same host as backups)."
Write-Host "Typical effects: objects may be recreated; data can be overwritten depending on dump contents."
Write-Host ""
$confirm = Read-Host "Type YES to continue"
if ($confirm -ne "YES") {
  Write-Host "Aborted."
  exit 1
}

try {
  $pgRestore = Get-PgRestoreExecutable
  Write-Host "Using pg_restore: $pgRestore"

  $env:PGPASSWORD = $pgPassword

  # --no-owner / --no-acl: common for managed Postgres (avoid local role ACL mismatches)
  $restoreArgs = @(
    "--verbose",
    "--no-owner",
    "--no-acl",
    "-h", $pgHost,
    "-p", $pgPort,
    "-U", $pgUser,
    "-d", $pgDb,
    $resolvedBackup.Path
  )

  Write-Host "Restoring..."
  Write-Host "  Host:     $pgHost"
  Write-Host "  Port:     $pgPort"
  Write-Host "  User:     $pgUser"
  Write-Host "  Database: $pgDb"

  & $pgRestore @restoreArgs
  if ($LASTEXITCODE -ne 0) {
    throw "pg_restore exited with code $LASTEXITCODE"
  }

  Write-Host "Restore completed."
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
