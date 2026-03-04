# Script to fix common Strapi setup issues
# Run: .\fix_strapi_setup.ps1

Write-Host "=== Fixing Strapi Setup ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\mgts-cms\mgts-backend"

if (-not (Test-Path $projectPath)) {
    Write-Host "[ERROR] Project directory not found: $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath

Write-Host "1. Reinstalling dependencies..." -ForegroundColor Yellow
Write-Host "   This may take several minutes..." -ForegroundColor Gray

# Remove node_modules and package-lock.json if they exist
if (Test-Path "node_modules") {
    Write-Host "   Removing old node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

# Install dependencies
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "   [ERROR] npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host "   [OK] Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "2. Verifying Strapi installation..." -ForegroundColor Yellow

# Check if Strapi is installed
$strapiCheck = npm list @strapi/strapi 2>$null
if ($strapiCheck -and $strapiCheck -like "*@strapi/strapi*") {
    Write-Host "   [OK] Strapi is installed" -ForegroundColor Green
    
    # Extract version
    if ($strapiCheck -match '@strapi/strapi@(\d+\.\d+\.\d+)') {
        $version = $matches[1]
        Write-Host "   [INFO] Strapi version: $version" -ForegroundColor Gray
    }
} else {
    Write-Host "   [WARNING] Cannot verify Strapi installation" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "3. Checking configuration files..." -ForegroundColor Yellow

$configFiles = @(
    @{Name="database.ts"; Path="config\database.ts"},
    @{Name="server.ts"; Path="config\server.ts"},
    @{Name="admin.ts"; Path="config\admin.ts"},
    @{Name="api.ts"; Path="config\api.ts"}
)

$allConfigOk = $true
foreach ($file in $configFiles) {
    if (Test-Path $file.Path) {
        Write-Host "   [OK] $($file.Name) exists" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] $($file.Name) not found" -ForegroundColor Yellow
        $allConfigOk = $false
    }
}

Write-Host ""

Write-Host "4. Testing Strapi commands..." -ForegroundColor Yellow

# Test if strapi command works
try {
    $strapiVersion = npx strapi --version 2>$null
    if ($strapiVersion) {
        Write-Host "   [OK] Strapi CLI is accessible" -ForegroundColor Green
        Write-Host "   [INFO] Version: $strapiVersion" -ForegroundColor Gray
    } else {
        Write-Host "   [WARNING] Cannot get Strapi version" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARNING] Cannot test Strapi CLI" -ForegroundColor Yellow
}

Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($allConfigOk) {
    Write-Host "[SUCCESS] Setup looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start Strapi: npm run develop" -ForegroundColor White
    Write-Host "2. Open: http://localhost:1337/admin" -ForegroundColor White
    Write-Host "3. Create your first admin user" -ForegroundColor White
} else {
    Write-Host "[WARNING] Some configuration files are missing" -ForegroundColor Yellow
    Write-Host "You may need to run: npm run develop" -ForegroundColor White
    Write-Host "Strapi will create missing files on first run" -ForegroundColor Gray
}

Write-Host ""

