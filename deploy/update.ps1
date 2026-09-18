# Oppdaterer nettsiden: sikkerhetskopi, ny kode, bygg og omstart.
# Bruk:  powershell -File deploy\update.ps1
param(
  [switch]$SkipPull,
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$settings = @{}
$settingsPath = Join-Path $PSScriptRoot ".env.local"
if (Test-Path $settingsPath) {
  foreach ($line in Get-Content $settingsPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $parts = $trimmed.Split("=", 2)
    if ($parts.Count -eq 2) { $settings[$parts[0].Trim()] = $parts[1].Trim() }
  }
}
$backupDir = if ($settings["FORM_BACKUP_DIR"]) { $settings["FORM_BACKUP_DIR"] } else { "$root\backups" }

if (-not $SkipBackup) {
  Write-Host "1/5  Sikkerhetskopi av databasen"
  if ($settings["FORM_DATA_DIR"]) { $env:FORM_DATA_DIR = $settings["FORM_DATA_DIR"] }
  node deploy/backup.mjs $backupDir
}

Write-Host "2/6  Stopper tjenestene mens vi bygger"
& (Join-Path $PSScriptRoot "stop.ps1") -Quiet -KeepTunnel

if (-not $SkipPull -and (git remote)) {
  Write-Host "3/6  Henter siste kode"
  git pull --ff-only
} else {
  Write-Host "3/6  Hopper over git pull."
}

$lockChanged = $false
if ((Test-Path package-lock.json) -and (Test-Path node_modules)) {
  $lockChanged = (Get-Item package-lock.json).LastWriteTime -gt (Get-Item node_modules).LastWriteTime
}
if ($lockChanged) {
  Write-Host "4/6  Nye avhengigheter - kjorer npm ci"
  $npm = (Get-Command npm -ErrorAction SilentlyContinue).Source
  if (-not $npm) {
    $bootstrap = Join-Path $env:TEMP "npm-bootstrap\package\bin\npm-cli.js"
    if (Test-Path $bootstrap) { $npm = (Get-Command node).Source; $npmArgs = @($bootstrap, "ci") }
  }
  if ($npm) {
    if ($npmArgs) { & $npm @npmArgs } else { & $npm ci }
  } else {
    Write-Warning "Fant ikke npm. Installer avhengigheter manuelt hvis bygget feiler."
  }
} else {
  Write-Host "4/6  Ingen endring i avhengigheter."
}

Write-Host "5/6  Bygger appen"
node node_modules\vite\bin\vite.js build

Write-Host "6/6  Starter pa nytt"
& (Join-Path $PSScriptRoot "start.ps1")
