$ErrorActionPreference = "Stop"

# ============================================================
# Oculus0Osint desktop launcher
# ============================================================
# This is the single entry point for a one-click start of the
# Oculus0Osint local edition. It is doctrine-aligned for Phase 1:
#   - Edition: local (no demo override)
#   - Port:    3010 (sticky)
#   - Host:    0.0.0.0 (LAN-reachable) + AUTH_TRUST_HOST=true
#   - Ollama:  127.0.0.1:11434, model store at C:\AI\OCULUSBOUND\ollama-models
# All side-state (logs, audit, model store) lives under C:\AI\OCULUSBOUND
# so the entire stack relocates as a single tree when C:\AI eventually
# migrates to F:\, or junctions into ARGOS when those are merged.

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = "3010"
$url = "http://localhost:$port"
$logDir = Join-Path $repoRoot "logs"
$serverLog = Join-Path $logDir "desktop-launch-3010.log"
$ollamaLog = Join-Path $logDir "ollama-oculus.log"

# Ollama configuration — co-located with the Oculus working tree
$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
$ollamaModels = "C:\AI\OCULUSBOUND\ollama-models"
$ollamaHost = "127.0.0.1:11434"
$ollamaPort = "11434"

# Phase 4 — local data engine stub (node scripts/local-data-engine.mjs).
# Replaces upstream wss://dataengine.worldwideview.dev with a same-host
# shim that translates Oculus's /api endpoints into the plugin engine
# protocol. Port 5000 per resolveEngineUrl.ts default.
$dataEnginePort = "5000"
$dataEngineLog = Join-Path $logDir "data-engine.log"
$dataEngineScript = Join-Path $repoRoot "scripts\local-data-engine.mjs"

if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Test-PortOpen {
    param([string] $Port)

    $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -eq "Listen" } |
        Select-Object -First 1

    return $null -ne $listener
}

function Start-DataEngineIfNeeded {
    if (Test-PortOpen -Port $dataEnginePort) {
        Write-Host "Data engine: already listening on 127.0.0.1:$dataEnginePort"
        return
    }
    if (-not (Test-Path -LiteralPath $dataEngineScript)) {
        Write-Warning "Data engine: script not found at $dataEngineScript. Plugins will see 'Data Engine API returned 404' until launched manually."
        return
    }
    Write-Host "Data engine: starting stub on 127.0.0.1:$dataEnginePort (script: $dataEngineScript)"
    $launchCmd = @"
Set-Location '$repoRoot'
`$env:WWV_DATA_ENGINE_PORT='$dataEnginePort'
`$env:OCULUS_BASE_URL='http://127.0.0.1:$port'
& node '$dataEngineScript' *>> '$dataEngineLog'
"@
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $launchCmd
    ) -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 500
        if (Test-PortOpen -Port $dataEnginePort) {
            Write-Host "Data engine: ready"
            return
        }
    } while ((Get-Date) -lt $deadline)
    Write-Warning "Data engine: did not bind within 10s. Check $dataEngineLog"
}

function Start-OllamaIfNeeded {
    if (Test-PortOpen -Port $ollamaPort) {
        Write-Host "Ollama: already listening on $ollamaHost"
        return
    }
    if (-not (Test-Path -LiteralPath $ollamaExe)) {
        Write-Warning "Ollama: binary not found at $ollamaExe. Oculus Analyst panel will report offline."
        return
    }
    if (-not (Test-Path -LiteralPath $ollamaModels)) {
        Write-Warning "Ollama: model store $ollamaModels does not exist. Daemon will start but have no models."
    }
    Write-Host "Ollama: starting daemon at $ollamaHost (models: $ollamaModels)"
    $launchScript = @"
`$env:OLLAMA_HOST = '$ollamaHost'
`$env:OLLAMA_MODELS = '$ollamaModels'
& '$ollamaExe' serve *>> '$ollamaLog'
"@
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $launchScript
    ) -WindowStyle Hidden
    # Wait briefly for the daemon to bind — don't block the rest of the launcher.
    $ollamaDeadline = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 500
        if (Test-PortOpen -Port $ollamaPort) {
            Write-Host "Ollama: ready"
            return
        }
    } while ((Get-Date) -lt $ollamaDeadline)
    Write-Warning "Ollama: did not bind within 15s. Check $ollamaLog"
}

Set-Location -LiteralPath $repoRoot

if (Test-PortOpen -Port $port) {
    Start-OllamaIfNeeded
    Start-DataEngineIfNeeded
    Start-Process $url
    Write-Host "Oculus0Osint is already running at $url"
    Start-Sleep -Seconds 2
    exit 0
}

# Start Ollama + data engine first so the app finds them on first request.
Start-OllamaIfNeeded
Start-DataEngineIfNeeded

# Local edition is the doctrine. Do NOT override with demo here —
# demo disables auth, history, and settings.
# Phase 8: bind to 127.0.0.1 (loopback only). This fork is operated as
# a sovereign single-user local edition; no need to listen on 0.0.0.0.
# AUTH_TRUST_HOST is no longer set because NextAuth accepts localhost
# without the trust flag — the only reason we needed it before was the
# 0.0.0.0 bind. Same change in .claude/launch.json.
$env:PORT = $port
$env:HOSTNAME = "127.0.0.1"
$env:NEXT_PUBLIC_WWV_EDITION = "local"
# Phase 2 — point the marketplace + registry URLs at the local mirror.
# Mirror lives at public/wwv-mirror/ and is populated by
# `node scripts/sync-plugin-mirror.mjs` (one-time op, owner-run).
$env:NEXT_PUBLIC_MARKETPLACE_URL = "http://localhost:$port/wwv-mirror"
$env:WWV_REGISTRY_URL = "http://localhost:$port/wwv-mirror/api/registry"
# Phase 4 — point the plugin data engine at the local stub on :5000.
$env:NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL = "http://localhost:$dataEnginePort"

Write-Host "Starting Oculus0Osint on $url ..."
Write-Host "Repo: $repoRoot"
Write-Host "Log:  $serverLog"

$serverCommand = @"
Set-Location -LiteralPath '$repoRoot'
`$env:PORT='$port'
`$env:HOSTNAME='127.0.0.1'
`$env:NEXT_PUBLIC_WWV_EDITION='local'
`$env:NEXT_PUBLIC_MARKETPLACE_URL='http://localhost:$port/wwv-mirror'
`$env:WWV_REGISTRY_URL='http://localhost:$port/wwv-mirror/api/registry'
`$env:NEXT_PUBLIC_WWV_PLUGIN_DATA_ENGINE_URL='http://localhost:$dataEnginePort'
corepack pnpm start *>> '$serverLog'
"@

Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $serverCommand
) -WindowStyle Minimized

$deadline = (Get-Date).AddSeconds(45)
do {
    Start-Sleep -Seconds 1
    if (Test-PortOpen -Port $port) {
        Start-Process $url
        Write-Host "Oculus0Osint is ready at $url"
        Start-Sleep -Seconds 2
        exit 0
    }
} while ((Get-Date) -lt $deadline)

Write-Warning "Oculus0Osint did not report ready within 45 seconds. Opening the app URL anyway."
Start-Process $url
Write-Host "If it does not load, check $serverLog"
Start-Sleep -Seconds 6
