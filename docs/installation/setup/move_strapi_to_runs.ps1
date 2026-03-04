# Script to move Strapi project to C:\runs directory
# Run: .\move_strapi_to_runs.ps1

Write-Host "=== Moving Strapi Project to C:\runs ===" -ForegroundColor Cyan
Write-Host ""

$sourcePath = "C:\mgts-cms\mgts-backend"
$targetBase = "C:\runs\mgts-cms"
$targetPath = "$targetBase\mgts-backend"

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "[ERROR] Source project not found: $sourcePath" -ForegroundColor Red
    Write-Host "Please check the path and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Source: $sourcePath" -ForegroundColor Gray
Write-Host "Target: $targetPath" -ForegroundColor Gray
Write-Host ""

# Check if target already exists
if (Test-Path $targetPath) {
    Write-Host "[WARNING] Target directory already exists: $targetPath" -ForegroundColor Yellow
    $response = Read-Host "Remove and recreate? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Removing existing directory..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $targetPath
    } else {
        Write-Host "Aborted" -ForegroundColor Red
        exit
    }
}

# Create target directory
Write-Host "Creating target directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $targetBase -Force | Out-Null
New-Item -ItemType Directory -Path $targetPath -Force | Out-Null

# Copy project using robocopy (preserves all attributes)
Write-Host "Copying project files..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

$robocopyResult = robocopy $sourcePath $targetPath /E /COPYALL /R:3 /W:5 /NP /NFL /NDL

# Check robocopy result
if ($robocopyResult -ge 8) {
    Write-Host "[ERROR] Copy failed or had errors" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Files copied successfully" -ForegroundColor Green
Write-Host ""

# Navigate to new location
Set-Location $targetPath

Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray

# Reinstall dependencies
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] npm install had issues, but project should still work" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Move Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Project moved to: $targetPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. cd C:\runs\mgts-cms\mgts-backend" -ForegroundColor White
Write-Host "2. npm run develop" -ForegroundColor White
Write-Host "3. Open: http://localhost:1337/admin" -ForegroundColor White
Write-Host ""
Write-Host "Note: Original project still exists at: $sourcePath" -ForegroundColor Gray
Write-Host "You can remove it after verifying the new location works." -ForegroundColor Gray
Write-Host ""

