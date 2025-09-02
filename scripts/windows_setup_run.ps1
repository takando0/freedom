param(
  [string]$RepoUrl = "https://github.com/takando0/freedom.git",
  [string]$InstallDir = "C:\\freedom",
  [switch]$FreshInstall
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR]  $msg" -ForegroundColor Red }

function Ensure-Program($name, $checkCmd, $wingetId) {
  Write-Info "Checking $name..."
  $exists = $false
  try { & $checkCmd | Out-Null; $exists = $true } catch { $exists = $false }
  if ($exists) { Write-Ok "$name found"; return }
  Write-Warn "$name not found. Installing via winget ($wingetId)"
  try {
    winget install --id $wingetId -e --accept-source-agreements --accept-package-agreements --silent | Out-Null
    Start-Sleep -Seconds 3
    & $checkCmd | Out-Null
    Write-Ok "$name installed"
  } catch {
    Write-Err "Failed to install $name automatically. Install manually and retry."
    throw
  }
}

Write-Info "Checking for winget"
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Err "winget is unavailable. Update Windows App Installer from Microsoft Store and retry."
  exit 1
}

Ensure-Program -name 'Git' -checkCmd 'git --version' -wingetId 'Git.Git'
Ensure-Program -name 'Node.js (LTS)' -checkCmd 'node --version' -wingetId 'OpenJS.NodeJS.LTS'

if ($FreshInstall -and (Test-Path $InstallDir)) {
  Write-Warn "Removing existing folder $InstallDir (FreshInstall)"
  Remove-Item -Recurse -Force $InstallDir
}

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null }
Set-Location $InstallDir

if (-not (Test-Path (Join-Path $InstallDir '.git'))) {
  Write-Info "Cloning repository $RepoUrl"
  git clone $RepoUrl . | Out-Null
} else {
  Write-Info "Updating repository (git pull)"
  git pull --rebase | Out-Null
}

Write-Info "Installing server dependencies"
Set-Location (Join-Path $InstallDir 'server')
npm ci

Write-Info "Installing client dependencies"
Set-Location (Join-Path $InstallDir 'client')
npm ci

Write-Info "Opening firewall rules for ports 3001 (server) and 5173 (client)"
try {
  netsh advfirewall firewall add rule name="FreedomGame_Server_3001" dir=in action=allow protocol=TCP localport=3001 | Out-Null
} catch {}
try {
  netsh advfirewall firewall add rule name="FreedomGame_Client_5173" dir=in action=allow protocol=TCP localport=5173 | Out-Null
} catch {}

function Get-LocalIPv4 {
  try {
    $ip = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress
    if (-not $ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.*' -and $_.InterfaceAlias -notlike '*Virtual*' } | Select-Object -First 1).IPAddress }
    return $ip
  } catch { return $null }
}

$ip = Get-LocalIPv4
if ($ip) { Write-Ok "Local IP: $ip" } else { Write-Warn "Failed to detect local IPv4" }

Write-Info "Starting server (port 3001) in a separate window"
Set-Location (Join-Path $InstallDir 'server')
Start-Process -WindowStyle Minimized -FilePath powershell -ArgumentList "-NoProfile","-NoLogo","-Command","$env:PORT=3001; node src/index.js"

Write-Info "Starting Vite client (port 5173) in a separate window"
Set-Location (Join-Path $InstallDir 'client')
Start-Process -WindowStyle Minimized -FilePath powershell -ArgumentList "-NoProfile","-NoLogo","-Command","npm run dev -- --host"

Write-Ok "Done! Open links (replace IP if needed):"
if ($ip) {
  Write-Host "  LED:     http://$ip:5173/led" -ForegroundColor Green
  Write-Host "  Tablet:  http://$ip:5173/tablet" -ForegroundColor Green
  Write-Host "  Admin:   http://$ip:5173/admin" -ForegroundColor Green
  Write-Host "  LED (slides): http://$ip:5173/led?slide=eco|info|top|other" -ForegroundColor DarkGray
} else {
  Write-Host "  LED:     http://<YOUR-IP>:5173/led" -ForegroundColor Green
  Write-Host "  Tablet:  http://<YOUR-IP>:5173/tablet" -ForegroundColor Green
  Write-Host "  Admin:   http://<YOUR-IP>:5173/admin" -ForegroundColor Green
}

Write-Host "Server and client are started in separate minimized windows. Close those PowerShell windows to stop." -ForegroundColor Cyan


