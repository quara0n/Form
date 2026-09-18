# Starter FormRehab på denne maskinen: API, app og valgfri tunnel.
# Innstillinger leses fra deploy/.env.local (lages fra .env.example).
param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $PSScriptRoot ".env.local"
$serverPidFile = Join-Path $PSScriptRoot ".server.pid"
$tunnelPidFile = Join-Path $PSScriptRoot ".tunnel.pid"
$serverLog = Join-Path $PSScriptRoot "server.log"
$tunnelLog = Join-Path $PSScriptRoot "tunnel.log"

function Write-Status($message) {
  if (-not $Quiet) { Write-Host $message }
}

# --- Les innstillinger ---
$settings = @{}
if (Test-Path $settingsPath) {
  foreach ($line in Get-Content $settingsPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $parts = $trimmed.Split("=", 2)
    if ($parts.Count -eq 2) { $settings[$parts[0].Trim()] = $parts[1].Trim() }
  }
}
$port = if ($settings["PORT"]) { $settings["PORT"] } else { "8787" }
$hostName = if ($settings["HOST"]) { $settings["HOST"] } else { "127.0.0.1" }
$nodeExe = if ($settings["NODE_EXE"]) { $settings["NODE_EXE"] } else { (Get-Command node).Source }

# --- Stopp det som kjører fra før ---
foreach ($pidFile in @($serverPidFile, $tunnelPidFile)) {
  if (Test-Path $pidFile) {
    $old = Get-Content $pidFile | Select-Object -First 1
    if ($old) { Stop-Process -Id ([int]$old) -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
}
$listening = netstat -ano | Select-String -Pattern ":$port\s+.*LISTENING"
foreach ($line in $listening) {
  $processId = ($line.ToString() -split "\s+")[-1]
  if ($processId -match "^\d+$") {
    Stop-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

# --- Tunnel (valgfritt) ---
$publicUrl = $settings["FORM_PUBLIC_URL"]
$cloudflared = Join-Path $root "tools\cloudflared.exe"
if ($settings["FORM_TUNNEL_TOKEN"]) {
  Write-Status "Starter navngitt tunnel"
  $tunnel = Start-Process -FilePath $cloudflared `
    -ArgumentList "tunnel", "run", "--token", $settings["FORM_TUNNEL_TOKEN"] `
    -WorkingDirectory $root -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError "$tunnelLog.err" -WindowStyle Hidden -PassThru
  $tunnel.Id | Out-File -FilePath $tunnelPidFile -Encoding ascii
} elseif ($settings["FORM_QUICK_TUNNEL"] -eq "1") {
  Write-Status "Starter midlertidig tunnel (tilfeldig adresse)"
  $tunnel = Start-Process -FilePath $cloudflared `
    -ArgumentList "tunnel", "--url", "http://127.0.0.1:$port", "--no-autoupdate" `
    -WorkingDirectory $root -RedirectStandardOutput $tunnelLog `
    -RedirectStandardError "$tunnelLog.err" -WindowStyle Hidden -PassThru
  $tunnel.Id | Out-File -FilePath $tunnelPidFile -Encoding ascii
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Path "$tunnelLog.err") {
      $match = Select-String -Path "$tunnelLog.err" `
        -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
      if ($match) { $publicUrl = $match.Matches.Value; break }
    }
  }
  if ($publicUrl) { Write-Status "Tunneladresse: $publicUrl" }
}

# --- Start serveren ---
$env:HOST = $hostName
$env:PORT = $port
if ($publicUrl) { $env:FORM_PUBLIC_URL = $publicUrl }
if ($settings["FORM_SECURE_COOKIES"]) { $env:FORM_SECURE_COOKIES = $settings["FORM_SECURE_COOKIES"] }
if ($settings["FORM_DATA_DIR"]) { $env:FORM_DATA_DIR = $settings["FORM_DATA_DIR"] }
if ($settings["OPENAI_API_KEY"]) { $env:OPENAI_API_KEY = $settings["OPENAI_API_KEY"] }

Write-Status "Starter serveren pa http://$hostName`:$port"
$server = Start-Process -FilePath $nodeExe `
  -ArgumentList "server\index.mjs" -WorkingDirectory $root `
  -RedirectStandardOutput $serverLog -RedirectStandardError "$serverLog.err" `
  -WindowStyle Hidden -PassThru
$server.Id | Out-File -FilePath $serverPidFile -Encoding ascii

# --- Vent til den svarer ---
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-WebRequest "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
      Write-Status "Serveren svarer."
      if (Test-Path $serverLog) { Get-Content $serverLog | Where-Object { $_ } | ForEach-Object { Write-Status "  $_" } }
      if ($settings["FORM_DEV_SERVER"] -eq "1") {
        Write-Status "Starter utviklingsserver pa 5173"
        Start-Process -FilePath $nodeExe `
          -ArgumentList "node_modules\vite\bin\vite.js", "--host", "127.0.0.1", "--port", "5173", "--strictPort" `
          -WorkingDirectory $root -RedirectStandardOutput (Join-Path $PSScriptRoot "vite.log") `
          -RedirectStandardError (Join-Path $PSScriptRoot "vite.log.err") -WindowStyle Hidden
      }
      if ($publicUrl) { Write-Status "Pasientadresse: $publicUrl" }
      exit 0
    }
  } catch {
    # prøver igjen
  }
}
Write-Error "Serveren svarte ikke. Se $serverLog og $serverLog.err"
exit 1

