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
  Write-Info "Проверяю $name..."
  $exists = $false
  try { & $checkCmd | Out-Null; $exists = $true } catch { $exists = $false }
  if ($exists) { Write-Ok "$name найден"; return }
  Write-Warn "$name не найден. Пытаюсь установить через winget ($wingetId)"
  try {
    winget install --id $wingetId -e --accept-source-agreements --accept-package-agreements --silent | Out-Null
    Start-Sleep -Seconds 3
    & $checkCmd | Out-Null
    Write-Ok "$name установлен"
  } catch {
    Write-Err "Не удалось установить $name автоматически. Установите вручную и повторите."
    throw
  }
}

Write-Info "Проверка наличия winget"
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Err "winget недоступен. Обновите Windows App Installer из Microsoft Store и повторите."
  exit 1
}

Ensure-Program -name 'Git' -checkCmd 'git --version' -wingetId 'Git.Git'
Ensure-Program -name 'Node.js (LTS)' -checkCmd 'node --version' -wingetId 'OpenJS.NodeJS.LTS'

if ($FreshInstall -and (Test-Path $InstallDir)) {
  Write-Warn "Удаляю существующую папку $InstallDir (FreshInstall)"
  Remove-Item -Recurse -Force $InstallDir
}

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null }
Set-Location $InstallDir

if (-not (Test-Path (Join-Path $InstallDir '.git'))) {
  Write-Info "Клонирую репозиторий $RepoUrl"
  git clone $RepoUrl . | Out-Null
} else {
  Write-Info "Обновляю репозиторий (git pull)"
  git pull --rebase | Out-Null
}

Write-Info "Установка зависимостей сервера"
Set-Location (Join-Path $InstallDir 'server')
npm ci

Write-Info "Установка зависимостей клиента"
Set-Location (Join-Path $InstallDir 'client')
npm ci

Write-Info "Открываю правила фаервола для портов 3001 (server) и 5173 (client)"
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
if ($ip) { Write-Ok "Локальный IP: $ip" } else { Write-Warn "Не удалось определить локальный IPv4" }

Write-Info "Запускаю сервер (порт 3001) в отдельном окне"
Set-Location (Join-Path $InstallDir 'server')
Start-Process -WindowStyle Minimized -FilePath powershell -ArgumentList "-NoProfile","-NoLogo","-Command","$env:PORT=3001; node src/index.js"

Write-Info "Запускаю клиент Vite (порт 5173) в отдельном окне"
Set-Location (Join-Path $InstallDir 'client')
Start-Process -WindowStyle Minimized -FilePath powershell -ArgumentList "-NoProfile","-NoLogo","-Command","npm run dev -- --host"

Write-Ok "Готово! Откройте ссылки (замените при необходимости IP):"
if ($ip) {
  Write-Host "  LED:     http://$ip:5173/led" -ForegroundColor Green
  Write-Host "  Tablet:  http://$ip:5173/tablet" -ForegroundColor Green
  Write-Host "  Admin:   http://$ip:5173/admin" -ForegroundColor Green
  Write-Host "  LED (слайды): http://$ip:5173/led?slide=eco|info|top|other" -ForegroundColor DarkGray
} else {
  Write-Host "  LED:     http://<YOUR-IP>:5173/led" -ForegroundColor Green
  Write-Host "  Tablet:  http://<YOUR-IP>:5173/tablet" -ForegroundColor Green
  Write-Host "  Admin:   http://<YOUR-IP>:5173/admin" -ForegroundColor Green
}

Write-Host "Окна сервера и клиента запущены отдельно (свернуты). Закрыть — завершите соответствующие PowerShell окна." -ForegroundColor Cyan


