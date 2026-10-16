# InvoiceOps Automated Test Suite Runner (PowerShell)
# Usage: .\scripts\run-tests.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  InvoiceOps -- Automated Quality Suite   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Ensure modern Java 21+ is used
if (Test-Path "C:\Program Files\Java\jdk-25") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-25"
} elseif (Test-Path "C:\Program Files\Java\jdk-21") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
}

$root = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "[1/3] Running Backend Tests (Spring Boot + JUnit 5 + MockMvc)..." -ForegroundColor Yellow
Set-Location "$root\backend"
& ".\mvnw.cmd" clean test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend tests failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Backend tests PASSED!" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Running Frontend Typecheck (TypeScript Strict Mode)..." -ForegroundColor Yellow
Set-Location "$root\frontend"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend type check failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Frontend type check PASSED!" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Running Frontend Production Build (Vite)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Set-Location $root
    exit 1
}
Write-Host "Frontend build PASSED!" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  All Quality Gates Passed Successfully!  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Set-Location $root
