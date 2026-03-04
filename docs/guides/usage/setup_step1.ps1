# Script for Stage 1 automation
# Run: .\setup_step1.ps1

Write-Host "=== Stage 1: Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Environment check
Write-Host "Step 1.1: Checking tools..." -ForegroundColor Yellow
if (Test-Path ".\check_environment.ps1") {
    & .\check_environment.ps1
} else {
    Write-Host "  Script check_environment.ps1 not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 1.2: Creating project structure..." -ForegroundColor Yellow

# Determine project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$currentDir = Get-Location

# Try to find SiteMGTS directory
$projectRoot = $null

# Option 1: Check if we're already in SiteMGTS or its subdirectory
if ($currentDir.Path -like "*SiteMGTS*") {
    # Find SiteMGTS in current path
    $pathParts = $currentDir.Path -split [regex]::Escape([System.IO.Path]::DirectorySeparatorChar)
    $siteMgtsIndex = [array]::IndexOf($pathParts, "SiteMGTS")
    if ($siteMgtsIndex -ge 0) {
        $projectRoot = ($pathParts[0..$siteMgtsIndex] -join [System.IO.Path]::DirectorySeparatorChar)
    }
}

# Option 2: Check if script is in SiteMGTS directory
if (-not $projectRoot -and $scriptPath -like "*SiteMGTS*") {
    $pathParts = $scriptPath -split [regex]::Escape([System.IO.Path]::DirectorySeparatorChar)
    $siteMgtsIndex = [array]::IndexOf($pathParts, "SiteMGTS")
    if ($siteMgtsIndex -ge 0) {
        $projectRoot = ($pathParts[0..$siteMgtsIndex] -join [System.IO.Path]::DirectorySeparatorChar)
    }
}

# Option 3: Use environment variable
if (-not $projectRoot -and $env:SITE_ROOT) {
    $projectRoot = $env:SITE_ROOT
}

# Option 4: Default path (if script is in C:\runs)
if (-not $projectRoot) {
    $defaultPath = "C:\Users\abefremov\SiteMGTS"
    if (Test-Path $defaultPath) {
        $projectRoot = $defaultPath
        Write-Host "  Using default path: $projectRoot" -ForegroundColor Yellow
    }
}

# Option 5: Try to find SiteMGTS by going up from script location
if (-not $projectRoot) {
    $searchDir = $scriptPath
    $maxDepth = 5
    $depth = 0
    while ($depth -lt $maxDepth -and $searchDir) {
        $testPath = Join-Path $searchDir "SiteMGTS"
        if (Test-Path $testPath) {
            $projectRoot = $testPath
            break
        }
        $searchDir = Split-Path -Parent $searchDir
        $depth++
    }
}

# Final check
if (-not $projectRoot -or -not (Test-Path $projectRoot)) {
    Write-Host "  ERROR: Cannot find SiteMGTS directory" -ForegroundColor Red
    Write-Host "  Please set environment variable SITE_ROOT or run script from SiteMGTS directory" -ForegroundColor Yellow
    Write-Host "  Example: `$env:SITE_ROOT='C:\Users\abefremov\SiteMGTS'" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Project root: $projectRoot" -ForegroundColor Gray

# Go to parent directory of project root
$parentDir = Split-Path -Parent $projectRoot
Write-Host "  Parent directory: $parentDir" -ForegroundColor Gray

Set-Location $parentDir

# Check if mgts-cms directory already exists
if (Test-Path "mgts-cms") {
    Write-Host "  Warning: Directory mgts-cms already exists" -ForegroundColor Yellow
    $response = Read-Host "  Continue? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "  Cancelled by user" -ForegroundColor Red
        Set-Location $currentDir
        exit
    }
} else {
    # Create directory
    Write-Host "  Creating directory mgts-cms..." -NoNewline
    try {
        New-Item -ItemType Directory -Path "mgts-cms" -Force | Out-Null
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " ERROR" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        Set-Location $currentDir
        exit 1
    }
}

Set-Location "mgts-cms"

Write-Host ""
Write-Host "  Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# Check Node.js before installing Strapi CLI
Write-Host "Step 1.3: Installing Strapi CLI..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  Node.js found: $nodeVersion" -ForegroundColor Green
        Write-Host "  Installing Strapi CLI (this may take a few minutes)..." -ForegroundColor Gray
        npm install -g @strapi/strapi
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Strapi CLI installed successfully" -ForegroundColor Green
        } else {
            Write-Host "  Error installing Strapi CLI" -ForegroundColor Red
            Set-Location $currentDir
            exit 1
        }
    } else {
        Write-Host "  Error: Node.js is not installed" -ForegroundColor Red
        Write-Host "  Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        Set-Location $currentDir
        exit 1
    }
} catch {
    Write-Host "  Error checking Node.js" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Set-Location $currentDir
    exit 1
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To create Strapi project, run:" -ForegroundColor White
$cmd1 = 'npx create-strapi-app@latest mgts-backend --quickstart'
Write-Host "  $cmd1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or for manual setup:" -ForegroundColor White
$cmd2 = 'npx create-strapi-app@latest mgts-backend'
Write-Host "  $cmd2" -ForegroundColor Cyan
Write-Host ""
