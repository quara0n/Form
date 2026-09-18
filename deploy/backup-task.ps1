# Daglig sikkerhetskopi. Kalles av Oppgavelisten, ikke av deg.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
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

if ($settings["FORM_DATA_DIR"]) { $env:FORM_DATA_DIR = $settings["FORM_DATA_DIR"] }
$target = if ($settings["FORM_BACKUP_DIR"]) { $settings["FORM_BACKUP_DIR"] } else { Join-Path $root "backups" }
$nodeExe = if ($settings["NODE_EXE"]) { $settings["NODE_EXE"] } else { "node" }

& $nodeExe (Join-Path $root "deploy\backup.mjs") $target

# Behold de fjorten nyeste, så mappen ikke vokser i det uendelige.
Get-ChildItem $target -Filter "form-*.db" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  Remove-Item -Force -ErrorAction SilentlyContinue
