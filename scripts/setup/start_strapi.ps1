# Script to start Strapi from allowed directory
# Run: .\start_strapi.ps1

# Try different possible locations
$possiblePaths = @(
    "C:\runs\mgts-cms\mgts-backend",
    "C:\mgts-cms\mgts-backend",
    "$env:USERPROFILE\mgts-cms\mgts-backend"
)

$projectPath = $null

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $projectPath = $path
        break
    }
}

if (-not $projectPath) {
    Write-Host "[ERROR] Strapi project not found in any of these locations:" -ForegroundColor Red
    foreach ($path in $possiblePaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Please specify the project path:" -ForegroundColor Yellow
    $customPath = Read-Host "Enter path to mgts-backend"
    if (Test-Path $customPath) {
        $projectPath = $customPath
    } else {
        Write-Host "[ERROR] Path not found: $customPath" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Found project at: $projectPath" -ForegroundColor Green
Write-Host "Starting Strapi..." -ForegroundColor Yellow
Write-Host ""

Set-Location $projectPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[WARNING] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start Strapi
npm run develop

