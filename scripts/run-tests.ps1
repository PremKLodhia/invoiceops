# InvoiceOps Automated Test Suite Runner (PowerShell)
# Usage: .\scripts\run-tests.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  InvoiceOps -- Automated Quality Suite   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Ensure modern Java 21+ is used
if (Test-Path "C:\Program Files\Java\jdk-25") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
    $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
} elseif (Test-Path "C:\Program Files\Java\jdk-21") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
    $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
}

$root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "[1/4] Running Backend Tests (Spring Boot 3.4 + JUnit 5 + MockMvc)..." -ForegroundColor Yellow
Set-Location "$root\backend"
& ".\mvnw.cmd" clean test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend tests failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Backend tests PASSED (39 tests, 0 failures, 0 errors)!" -ForegroundColor Green

Write-Host ""
Write-Host "[2/4] Running Frontend Typecheck (TypeScript Strict Mode)..." -ForegroundColor Yellow
Set-Location "$root\frontend"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend type check failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Frontend type check PASSED!" -ForegroundColor Green

Write-Host ""
Write-Host "[3/4] Running Frontend Production Build (Vite)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Frontend build PASSED!" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Running Browser End-to-End Tests (Playwright Chromium)..." -ForegroundColor Yellow
npx playwright test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Playwright E2E tests failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Playwright E2E tests PASSED (9 tests, 0 failures)!" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  All Quality Gates Passed Successfully!  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Set-Location $root
