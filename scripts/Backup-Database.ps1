param(
  [switch]$TestConnection
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$EnvPath = Join-Path $RepoRoot ".env.local"
$CommonPath = Join-Path $ScriptDir "SupabaseDbConnection.ps1"
. $CommonPath

function Find-PgDumpPath {
  $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) {
    return $cmd.Source
  }

  $roots = @(
    # PostgreSQL Windows installers commonly install here:
    "C:\Program Files\PostgreSQL",
    "C:\Program Files (x86)\PostgreSQL"
  )

  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $bins = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending

    foreach ($dir in $bins) {
      $candidate = Join-Path $dir.FullName "bin\pg_dump.exe"
      if (Test-Path -LiteralPath $candidate) {
        return $candidate
      }
    }
  }

  throw @"
Could not find pg_dump.

Install PostgreSQL client tools (Windows installer), then either:
- Add PostgreSQL `bin` to PATH, OR
- Install into the default location:
  `C:\Program Files\PostgreSQL\<version>\bin\`
"@
}

$pgDumpPath = Find-PgDumpPath
Write-Host "Using pg_dump: $pgDumpPath"

$envMap = Read-DotEnvLocal -Path $EnvPath

if (-not $envMap.ContainsKey("SUPABASE_HOST") -or [string]::IsNullOrWhiteSpace($envMap["SUPABASE_HOST"])) {
  throw "Missing SUPABASE_HOST in .env.local"
}
if (-not $envMap.ContainsKey("SUPABASE_USER") -or [string]::IsNullOrWhiteSpace($envMap["SUPABASE_USER"])) {
  throw "Missing SUPABASE_USER in .env.local"
}
if (-not $envMap.ContainsKey("SUPABASE_PORT") -or [string]::IsNullOrWhiteSpace($envMap["SUPABASE_PORT"])) {
  throw "Missing SUPABASE_PORT in .env.local"
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
$pgPort = $envMap["SUPABASE_PORT"].Trim()
$pgDb = Get-PgDatabaseNameFromMap -EnvMap $envMap

if ($TestConnection) {
  $portNum = 0
  if (-not [int]::TryParse($pgPort, [ref]$portNum)) {
    throw "SUPABASE_PORT must be a number (got: $pgPort)"
  }

  Write-Host "Testing DNS resolution for host: $pgHost"
  try {
    $addrs = [System.Net.Dns]::GetHostAddresses($pgHost)
    Write-Host "DNS: OK - $($addrs.Count) address(es) returned." -ForegroundColor Green
  } catch {
    Write-Host "DNS: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-SupabaseConnectionHelp
    exit 1
  }

  Write-Host "Testing TCP connectivity to ${pgHost}:${portNum} ..."
  $tnc = Test-NetConnection -ComputerName $pgHost -Port $portNum -WarningAction SilentlyContinue
  Write-Host "TCP reachable: $($tnc.TcpTestSucceeded)" -ForegroundColor $(if ($tnc.TcpTestSucceeded) { "Green" } else { "Red" })

  if (-not $tnc.TcpTestSucceeded) {
    Write-SupabaseConnectionHelp
    exit 1
  }

  Write-Host "Connection test passed." -ForegroundColor Green
  exit 0
}

if (-not $envMap.ContainsKey("SUPABASE_PASSWORD") -or [string]::IsNullOrWhiteSpace($envMap["SUPABASE_PASSWORD"])) {
  throw "Missing SUPABASE_PASSWORD in .env.local"
}

$backupDir = Join-Path $RepoRoot "backups"
if (-not (Test-Path -LiteralPath $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm"
$outFile = Join-Path $backupDir "pratiqo-backup-$timestamp.dump"

$env:PGPASSWORD = $envMap["SUPABASE_PASSWORD"]

try {
  Write-Host "Backing up database '$pgDb' to:"
  Write-Host $outFile

  & $pgDumpPath `
    --host $pgHost `
    --port $pgPort `
    --username $pgUser `
    --dbname $pgDb `
    --format=custom `
    --no-owner `
    --no-acl `
    --file $outFile

  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE"
  }

  Write-Host "Backup complete." -ForegroundColor Green
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
