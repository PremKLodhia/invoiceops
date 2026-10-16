# InvoiceOps Local Development Launcher (PowerShell)
# Usage: .\scripts\run-dev.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  InvoiceOps — Local Development Runtime  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Ensure modern Java 21+ is used
if (Test-Path "C:\Program Files\Java\jdk-25") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
} elseif (Test-Path "C:\Program Files\Java\jdk-21") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
}

Write-Host "[1/3] Checking environment..." -ForegroundColor Yellow
Write-Host "  JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray

# Check Docker status
$dockerRunning = $false
try {
    $null = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "  Docker daemon: Running" -ForegroundColor Green
    }
} catch {
    # Docker not running
}

if (-not $dockerRunning) {
    Write-Host "  Docker daemon: Not running (app will fall back to local DB/in-memory mode)" -ForegroundColor Yellow
} else {
    Write-Host "[2/3] Starting PostgreSQL container..." -ForegroundColor Yellow
    docker compose -f infra/docker-compose.yml up -d
}

Write-Host "[3/3] Application startup commands:" -ForegroundColor Green
Write-Host "  Backend:  cd backend; .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev" -ForegroundColor White
Write-Host "  Frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Demo Credentials (when APP_DEMO_MODE=true):" -ForegroundColor Cyan
Write-Host "  Admin:    admin@invoiceops.local    / DemoAdmin2026!" -ForegroundColor Gray
Write-Host "  Reviewer: reviewer@invoiceops.local / DemoReviewer2026!" -ForegroundColor Gray
Write-Host "  Approver: approver@invoiceops.local / DemoApprover2026!" -ForegroundColor Gray
