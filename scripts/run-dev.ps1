# InvoiceOps Local Development Launcher (PowerShell)
# Usage:
#   .\scripts\run-dev.ps1                     # Default: Zero-dependency H2 mode, launches backend & frontend windows
#   .\scripts\run-dev.ps1 -Database postgres  # PostgreSQL mode via Docker Compose with Flyway migrations
#   .\scripts\run-dev.ps1 -NoLaunch           # Print startup commands only without launching windows

param(
    [ValidateSet("h2", "postgres")]
    [string]$Database = "h2",
    [switch]$NoLaunch
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  InvoiceOps — Local Development Runtime  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Ensure modern Java 21+ is selected
if (Test-Path "C:\Program Files\Java\jdk-25") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
    $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
} elseif (Test-Path "C:\Program Files\Java\jdk-21") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
    $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
}

$root = Split-Path -Parent $PSScriptRoot

Write-Host "[1/3] Environment Configuration:" -ForegroundColor Yellow
Write-Host "  JAVA_HOME:    $env:JAVA_HOME" -ForegroundColor Gray
Write-Host "  Database:     $Database" -ForegroundColor Gray

if ($Database -eq "postgres") {
    Write-Host "[2/3] Checking Docker daemon for PostgreSQL..." -ForegroundColor Yellow
    $dockerRunning = $false
    try {
        $null = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerRunning = $true
        }
    } catch {
        $dockerRunning = $false
    }

    if (-not $dockerRunning) {
        Write-Host "ERROR: Docker is not running, but PostgreSQL mode was requested." -ForegroundColor Red
        Write-Host "Please start Docker Desktop, or run with zero dependencies using:" -ForegroundColor Yellow
        Write-Host "  .\scripts\run-dev.ps1 -Database h2" -ForegroundColor White
        exit 1
    }

    Write-Host "  Starting PostgreSQL container via docker compose..." -ForegroundColor Green
    docker compose -f "$root\infra\docker-compose.yml" up -d
    $activeProfiles = "dev,postgres"
} else {
    Write-Host "[2/3] Using Zero-Dependency Local H2 Database (no Docker required)..." -ForegroundColor Green
    $activeProfiles = "dev,h2"
}

if ($NoLaunch) {
    Write-Host "[3/3] Application Startup Commands (NoLaunch requested):" -ForegroundColor Green
    Write-Host "  Backend:  cd backend; .\mvnw.cmd spring-boot:run `"-Dspring-boot.run.profiles=$activeProfiles`"" -ForegroundColor White
    Write-Host "  Frontend: cd frontend; npm run dev" -ForegroundColor White
} else {
    Write-Host "[3/3] Launching Application Services in dedicated windows..." -ForegroundColor Green

    # Launch Backend
    $backendCmd = "cd `"$root\backend`"; `$env:JAVA_HOME = `"$env:JAVA_HOME`"; `$env:Path = `"`$env:JAVA_HOME\bin;`" + `$env:Path; .\mvnw.cmd spring-boot:run `"-Dspring-boot.run.profiles=$activeProfiles`""
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
    Write-Host "  [OK] Spring Boot Backend launched ($activeProfiles)" -ForegroundColor Green

    # Launch Frontend
    $frontendCmd = "cd `"$root\frontend`"; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
    Write-Host "  [OK] Vite Frontend launched" -ForegroundColor Green
}

Write-Host ""
Write-Host "Demo Credentials (when APP_DEMO_MODE=true):" -ForegroundColor Cyan
Write-Host "  Admin:    admin@invoiceops.local    / DemoAdmin2026!" -ForegroundColor Gray
Write-Host "  Reviewer: reviewer@invoiceops.local / DemoReviewer2026!" -ForegroundColor Gray
Write-Host "  Approver: approver@invoiceops.local / DemoApprover2026!" -ForegroundColor Gray
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Cyan
Write-Host "  Frontend Workbench:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend REST API:    http://localhost:8080" -ForegroundColor White
Write-Host "  Swagger OpenAPI:     http://localhost:8080/api/swagger-ui" -ForegroundColor White
