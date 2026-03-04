# Script to check Strapi installation
# Run: .\check_strapi_setup.ps1

Write-Host "=== Strapi Installation Check ===" -ForegroundColor Cyan
Write-Host ""

$allOk = $true
$errors = @()
$warnings = @()

# Check 1: Project directory
Write-Host "1. Checking project directory..." -ForegroundColor Yellow
$projectPath = "C:\mgts-cms\mgts-backend"
if (Test-Path $projectPath) {
    Write-Host "   [OK] Project directory exists: $projectPath" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Project directory not found: $projectPath" -ForegroundColor Red
    $allOk = $false
    $errors += "Project directory not found"
}

Write-Host ""

# Check 2: package.json
Write-Host "2. Checking package.json..." -ForegroundColor Yellow
$packageJsonPath = Join-Path $projectPath "package.json"
if (Test-Path $packageJsonPath) {
    Write-Host "   [OK] package.json exists" -ForegroundColor Green
    
    # Check package.json content
    try {
        $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        
        # Check for Strapi dependency
        if ($packageJson.dependencies.'@strapi/strapi' -or $packageJson.dependencies.strapi) {
            Write-Host "   [OK] Strapi dependency found" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] Strapi dependency not found in package.json" -ForegroundColor Yellow
            $warnings += "Strapi dependency not found"
        }
        
        # Check scripts
        if ($packageJson.scripts.develop) {
            Write-Host "   [OK] Scripts configured" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] Scripts not configured" -ForegroundColor Yellow
            $warnings += "Scripts not configured"
        }
    } catch {
        Write-Host "   [ERROR] Cannot parse package.json: $($_.Exception.Message)" -ForegroundColor Red
        $allOk = $false
        $errors += "Cannot parse package.json"
    }
} else {
    Write-Host "   [ERROR] package.json not found" -ForegroundColor Red
    $allOk = $false
    $errors += "package.json not found"
}

Write-Host ""

# Check 3: node_modules
Write-Host "3. Checking node_modules..." -ForegroundColor Yellow
$nodeModulesPath = Join-Path $projectPath "node_modules"
if (Test-Path $nodeModulesPath) {
    Write-Host "   [OK] node_modules directory exists" -ForegroundColor Green
    
    # Check for Strapi in node_modules
    $strapiPath = Join-Path $nodeModulesPath "@strapi\strapi"
    if (Test-Path $strapiPath) {
        Write-Host "   [OK] Strapi installed in node_modules" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] Strapi not found in node_modules" -ForegroundColor Yellow
        $warnings += "Strapi not found in node_modules"
    }
} else {
    Write-Host "   [ERROR] node_modules directory not found" -ForegroundColor Red
    Write-Host "   [INFO] Run: npm install" -ForegroundColor Cyan
    $allOk = $false
    $errors += "node_modules not found"
}

Write-Host ""

# Check 4: Configuration files
Write-Host "4. Checking configuration files..." -ForegroundColor Yellow
$configPath = Join-Path $projectPath "config"
if (Test-Path $configPath) {
    Write-Host "   [OK] Config directory exists" -ForegroundColor Green
    
    # Check for database.js
    $dbConfigPath = Join-Path $configPath "database.js"
    if (Test-Path $dbConfigPath) {
        Write-Host "   [OK] database.js exists" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] database.js not found" -ForegroundColor Yellow
        $warnings += "database.js not found"
    }
    
    # Check for server.js
    $serverConfigPath = Join-Path $configPath "server.js"
    if (Test-Path $serverConfigPath) {
        Write-Host "   [OK] server.js exists" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] server.js not found" -ForegroundColor Yellow
        $warnings += "server.js not found"
    }
} else {
    Write-Host "   [WARNING] Config directory not found" -ForegroundColor Yellow
    $warnings += "Config directory not found"
}

Write-Host ""

# Check 5: Source files
Write-Host "5. Checking source files..." -ForegroundColor Yellow
$srcPath = Join-Path $projectPath "src"
if (Test-Path $srcPath) {
    Write-Host "   [OK] src directory exists" -ForegroundColor Green
    
    # Check for api directory
    $apiPath = Join-Path $srcPath "api"
    if (Test-Path $apiPath) {
        Write-Host "   [OK] api directory exists" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] api directory not found (will be created on first run)" -ForegroundColor Gray
    }
} else {
    Write-Host "   [WARNING] src directory not found" -ForegroundColor Yellow
    $warnings += "src directory not found"
}

Write-Host ""

# Check 6: .env file
Write-Host "6. Checking environment file..." -ForegroundColor Yellow
$envPath = Join-Path $projectPath ".env"
if (Test-Path $envPath) {
    Write-Host "   [OK] .env file exists" -ForegroundColor Green
} else {
    Write-Host "   [INFO] .env file not found (will be created on first run)" -ForegroundColor Gray
}

Write-Host ""

# Check 7: Database file (for SQLite)
Write-Host "7. Checking database..." -ForegroundColor Yellow
$dbPath = Join-Path $projectPath ".tmp\data.db"
if (Test-Path $dbPath) {
    Write-Host "   [OK] Database file exists" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Database file not found (will be created on first run)" -ForegroundColor Gray
}

Write-Host ""

# Check 8: Try to run Strapi commands
Write-Host "8. Checking Strapi CLI..." -ForegroundColor Yellow
Set-Location $projectPath
try {
    $strapiVersion = npm list @strapi/strapi 2>$null
    if ($strapiVersion -and $strapiVersion -like "*@strapi/strapi*") {
        Write-Host "   [OK] Strapi CLI accessible" -ForegroundColor Green
        
        # Extract version
        if ($strapiVersion -match '@strapi/strapi@(\d+\.\d+\.\d+)') {
            $version = $matches[1]
            Write-Host "   [INFO] Strapi version: $version" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [WARNING] Cannot verify Strapi installation" -ForegroundColor Yellow
        $warnings += "Cannot verify Strapi installation"
    }
} catch {
    Write-Host "   [ERROR] Cannot check Strapi CLI: $($_.Exception.Message)" -ForegroundColor Red
    $warnings += "Cannot check Strapi CLI"
}

Write-Host ""

# Check 9: Port availability
Write-Host "9. Checking port 1337..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 1337 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($connection) {
        Write-Host "   [INFO] Port 1337 is in use (Strapi might be running)" -ForegroundColor Cyan
    } else {
        Write-Host "   [OK] Port 1337 is available" -ForegroundColor Green
    }
} catch {
    Write-Host "   [INFO] Cannot check port (might require admin rights)" -ForegroundColor Gray
}

Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($allOk) {
    Write-Host "[SUCCESS] Basic installation check passed!" -ForegroundColor Green
} else {
    Write-Host "[FAILED] Installation check found errors!" -ForegroundColor Red
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errors found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan

if (-not $allOk) {
    Write-Host "1. Fix the errors listed above" -ForegroundColor White
    Write-Host "2. Run: cd C:\mgts-cms\mgts-backend" -ForegroundColor White
    Write-Host "3. Run: npm install" -ForegroundColor White
    Write-Host "4. Run this check again" -ForegroundColor White
} else {
    Write-Host "1. Start Strapi: cd C:\mgts-cms\mgts-backend && npm run develop" -ForegroundColor White
    Write-Host "2. Open: http://localhost:1337/admin" -ForegroundColor White
    Write-Host "3. Create your first admin user" -ForegroundColor White
}

Write-Host ""

