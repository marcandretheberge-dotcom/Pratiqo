# Shared helpers for Backup-Database.ps1 and Restore-Database.ps1 (dot-source only; do not run directly).

function Read-DotEnvLocal {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing file: $Path"
  }
  $raw = [System.IO.File]::ReadAllText($Path)
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

function Assert-SupabaseHostFormat {
  param(
    [Parameter(Mandatory = $true)]
    [string]$HostValue
  )
  if ([string]::IsNullOrWhiteSpace($HostValue)) {
    throw "SUPABASE_HOST is empty in .env.local."
  }
  $h = $HostValue.Trim()
  if ($h -match '^\s*https?://') {
    throw @"
SUPABASE_HOST must be a hostname only, not a URL. Example: db.<project-ref>.supabase.co or the Supabase pooler host (Session Pooler / Transaction Pooler) from the dashboard.
"@
  }
  if ($h.Contains("://")) {
    throw "SUPABASE_HOST must not contain a URL scheme. Use the host only (no http:// or similar)."
  }
  if ($h.Contains("/")) {
    throw "SUPABASE_HOST must be a hostname only; remove any path or trailing slash after the host."
  }
}

function Get-PgDatabaseNameFromMap {
  param([hashtable]$EnvMap)
  $pgDb = "postgres"
  if ($EnvMap.ContainsKey("SUPABASE_DB") -and -not [string]::IsNullOrWhiteSpace($EnvMap["SUPABASE_DB"])) {
    return $EnvMap["SUPABASE_DB"].Trim()
  }
  if ($EnvMap.ContainsKey("POSTGRES_DB") -and -not [string]::IsNullOrWhiteSpace($EnvMap["POSTGRES_DB"])) {
    return $EnvMap["POSTGRES_DB"].Trim()
  }
  return $pgDb
}

function Write-SupabaseConnectionHelp {
  Write-Host ""
  Write-Host "--- Supabase connection help ---" -ForegroundColor Yellow
  Write-Host "Check Supabase Dashboard -> Project Settings -> Database -> Connection string."
  Write-Host "Use either the direct database host or the Session Pooler host (as documented there)."
  Write-Host "SUPABASE_HOST should be a host only, without https://"
  Write-Host "Direct DB user is often 'postgres'; pooler user may look like postgres.<project-ref>"
  Write-Host "SUPABASE_PORT is often 5432; use the port shown in the dashboard for your chosen mode."
  Write-Host "--------------------------------"
  Write-Host ""
}
