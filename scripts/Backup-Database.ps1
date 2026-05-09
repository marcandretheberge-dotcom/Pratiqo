#Requires -Version 5.1
<#
.SYNOPSIS
  Backs up the Pratiqo Supabase Postgres database using pg_dump (custom format).

  Reads connection settings from .env.local at the repository root. Never prints the password.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectRoot ".env.local"
$BackupsDir = Join-Path $ProjectRoot "backups"

function Get-PgDumpExecutable {
  $candidates = @(
    (Get-Command "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
  )
  foreach ($p in $candidates) {
    if ([string]::IsNullOrWhiteSpace($p)) { continue }
    if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).Path }
  }
  throw "pg_dump.exe not found. Install PostgreSQL client tools or add pg_dump to PATH."
}

function Read-DotEnvLocal {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing file: $Path"
  }
  $raw = [System.IO.File]::ReadAllText($Path)
  # Strip UTF-8 BOM if present
  if ($raw.Length -ge 1 -and [int][char]$raw[0] -eq 0xFEFF) {
    $raw = $raw.Substring(1)
  }
  $map = @{}
  foreach ($line in $raw -split "`r?`n") {
    $t = $line.Trim()
    if ($t.Length -eq 0 -or $t.StartsWith("#")) { continue }
    $eq = $t.IndexOf("=")
    if ($eq -lt 1) { continue }
    $key = $t.Substring(0, $eq).Trim()
    $val = $t.Substring($eq + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $map[$key] = $val
  }
  return $map
}

try {
  $pgDump = Get-PgDumpExecutable
  Write-Host "Using pg_dump: $pgDump"

  $envMap = Read-DotEnvLocal -Path $EnvFile

  $required = @("SUPABASE_HOST", "SUPABASE_USER", "SUPABASE_PASSWORD", "SUPABASE_PORT")
  foreach ($k in $required) {
    if (-not $envMap.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($envMap[$k])) {
      throw "Missing or empty required key in .env.local: $k"
    }
  }

  $pgHost = $envMap["SUPABASE_HOST"].Trim()
  $pgUser = $envMap["SUPABASE_USER"].Trim()
  $pgPassword = $envMap["SUPABASE_PASSWORD"]
  $pgPort = $envMap["SUPABASE_PORT"].Trim()

  $pgDb = "postgres"
  if ($envMap.ContainsKey("SUPABASE_DB") -and -not [string]::IsNullOrWhiteSpace($envMap["SUPABASE_DB"])) {
    $pgDb = $envMap["SUPABASE_DB"].Trim()
  }
  elseif ($envMap.ContainsKey("POSTGRES_DB") -and -not [string]::IsNullOrWhiteSpace($envMap["POSTGRES_DB"])) {
    $pgDb = $envMap["POSTGRES_DB"].Trim()
  }

  if (-not (Test-Path -LiteralPath $BackupsDir)) {
    New-Item -ItemType Directory -Path $BackupsDir | Out-Null
  }

  $stamp = Get-Date -Format "yyyy-MM-dd-HH-mm"
  $outFile = Join-Path $BackupsDir "pratiqo-backup-$stamp.dump"

  $env:PGPASSWORD = $pgPassword

  $dumpArgs = @(
    "-Fc",
    "-h", $pgHost,
    "-p", $pgPort,
    "-U", $pgUser,
    "-d", $pgDb,
    "-f", $outFile
  )

  Write-Host "Starting backup (custom format)..."
  Write-Host "  Host:     $pgHost"
  Write-Host "  Port:     $pgPort"
  Write-Host "  User:     $pgUser"
  Write-Host "  Database: $pgDb"
  Write-Host "  Output:   $outFile"

  & $pgDump @dumpArgs
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump exited with code $LASTEXITCODE"
  }

  Write-Host "Backup completed successfully."
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
