$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = "3011"
$url = "http://localhost:$port"
$logDir = Join-Path $repoRoot "logs"
$logFile = Join-Path $logDir "desktop-launch-3011.log"

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

Set-Location -LiteralPath $repoRoot

if (Test-PortOpen -Port $port) {
    Start-Process $url
    Write-Host "Oculus0Osint is already running at $url"
    Start-Sleep -Seconds 2
    exit 0
}

$env:PORT = $port
$env:HOSTNAME = "0.0.0.0"
$env:NEXT_PUBLIC_WWV_EDITION = "demo"
$env:NEXT_PUBLIC_DEMO_DEFAULT_PLUGINS = "sample-intelligence"

Write-Host "Starting Oculus0Osint on $url ..."
Write-Host "Repo: $repoRoot"
Write-Host "Log:  $logFile"

$serverCommand = @"
Set-Location -LiteralPath '$repoRoot'
`$env:PORT='$port'
`$env:HOSTNAME='0.0.0.0'
`$env:NEXT_PUBLIC_WWV_EDITION='demo'
`$env:NEXT_PUBLIC_DEMO_DEFAULT_PLUGINS='sample-intelligence'
corepack pnpm start *>> '$logFile'
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
Write-Host "If it does not load, check $logFile"
Start-Sleep -Seconds 6
