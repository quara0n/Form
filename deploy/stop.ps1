# Stopper serveren og tunnelen trygt, slik at filer ikke ligger lastet
# mens avhengigheter installeres eller appen bygges pa nytt.
param(
  [int]$Port = 0,
  [switch]$Quiet,
  # Behold tunnelen. Da beholder den midlertidige adressen seg gjennom en
  # oppdatering, og QR-koder som alt er skrevet ut slutter ikke a virke.
  [switch]$KeepTunnel
)

$root = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $PSScriptRoot ".env.local"
$settings = @{}
if (Test-Path $settingsPath) {
  foreach ($line in Get-Content $settingsPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $parts = $trimmed.Split("=", 2)
    if ($parts.Count -eq 2) { $settings[$parts[0].Trim()] = $parts[1].Trim() }
  }
}
if (-not $Port) { $Port = if ($settings["PORT"]) { [int]$settings["PORT"] } else { 8787 } }

$pidFiles = if ($KeepTunnel) { @("server.pid") } else { @("server.pid", "tunnel.pid") }
foreach ($pidFile in $pidFiles) {
  $path = Join-Path $PSScriptRoot ".$pidFile"
  if (Test-Path $path) {
    $old = Get-Content $path | Select-Object -First 1
    if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
    Remove-Item $path -Force -ErrorAction SilentlyContinue
  }
}

foreach ($port in @($Port, 5173)) {
  $lines = netstat -ano | Select-String -Pattern ":$port\s+.*LISTENING"
  foreach ($line in $lines) {
    $processId = ($line.ToString() -split "\s+")[-1]
    if ($processId -match "^\d+$") {
      Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
    }
  }
}

# esbuild ligger i node_modules og laser filene mens den kjorer.
Get-CimInstance Win32_Process -Filter "Name = 'esbuild.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.ExecutablePath -like "$root*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 3
if (-not $Quiet) { Write-Host "Tjenestene er stoppet." }
