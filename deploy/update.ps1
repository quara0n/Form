# Oppdaterer nettsiden: sikkerhetskopi, ny kode, bygg og omstart.
# Bruk:  powershell -File deploy\update.ps1
param(
  [switch]$SkipPull,
  [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $SkipBackup) {
  Write-Host "1/5  Sikkerhetskopi av databasen"
  node deploy/backup.mjs "$root\backups"
}

if (-not $SkipPull -and (git remote)) {
  Write-Host "2/5  Henter siste kode"
  git pull --ff-only
} else {
  Write-Host "2/5  Hopper over git pull."
}

$lockChanged = $false
if ((Test-Path package-lock.json) -and (Test-Path node_modules)) {
  $lockChanged = (Get-Item package-lock.json).LastWriteTime -gt (Get-Item node_modules).LastWriteTime
}
if ($lockChanged) {
  Write-Host "3/5  Nye avhengigheter - kjorer npm ci"
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
  Write-Host "3/5  Ingen endring i avhengigheter."
}

Write-Host "4/5  Bygger appen"
node node_modules\vite\bin\vite.js build

Write-Host "5/5  Starter pa nytt"
& (Join-Path $PSScriptRoot "start.ps1")
