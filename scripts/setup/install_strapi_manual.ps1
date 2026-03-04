# Manual Strapi installation script
# Use this if npx is blocked by group policy

Write-Host "=== Manual Strapi Installation ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
$currentDir = Get-Location
if (-not ($currentDir.Path -like "*mgts-cms*")) {
    Write-Host "Warning: Not in mgts-cms directory" -ForegroundColor Yellow
    Write-Host "Current directory: $currentDir" -ForegroundColor Gray
    $response = Read-Host "Continue? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit
    }
}

# Create project directory
$projectName = "mgts-backend"
if (Test-Path $projectName) {
    Write-Host "Directory $projectName already exists" -ForegroundColor Yellow
    $response = Read-Host "Remove and recreate? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Remove-Item -Recurse -Force $projectName
    } else {
        Write-Host "Aborted" -ForegroundColor Red
        exit
    }
}

Write-Host "Creating project directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $projectName -Force | Out-Null
Set-Location $projectName

Write-Host "Initializing npm project..." -ForegroundColor Yellow
npm init -y | Out-Null

Write-Host "Installing Strapi..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray

# Install Strapi
npm install strapi@latest --save

# Install required plugins
npm install @strapi/plugin-users-permissions@latest --save
npm install @strapi/plugin-i18n@latest --save
npm install @strapi/plugin-upload@latest --save

# Install SQLite for quickstart
npm install better-sqlite3@latest --save

Write-Host ""
Write-Host "Updating package.json scripts..." -ForegroundColor Yellow

# Read and update package.json
$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
$packageJson.scripts = @{
    "develop" = "strapi develop"
    "start" = "strapi start"
    "build" = "strapi build"
    "strapi" = "strapi"
}
$packageJson | ConvertTo-Json -Depth 10 | Set-Content package.json

Write-Host ""
Write-Host "Creating basic Strapi structure..." -ForegroundColor Yellow

# Create basic directory structure
$dirs = @(
    "src",
    "src\api",
    "src\components",
    "config",
    "database",
    "public"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Create basic config file
$configContent = @"
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
"@

Set-Content -Path "config\server.js" -Value $configContent

# Create basic database config for SQLite
$dbConfig = @"
const path = require('path');

module.exports = ({ env }) => ({
  connection: {
    client: 'better-sqlite3',
    connection: {
      filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
    },
    useNullAsDefault: true,
  },
});
"@

Set-Content -Path "config\database.js" -Value $dbConfig

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run develop" -ForegroundColor White
Write-Host "2. Open: http://localhost:1337/admin" -ForegroundColor White
Write-Host "3. Create your first admin user" -ForegroundColor White
Write-Host ""
Write-Host "Note: This is a basic installation." -ForegroundColor Yellow
Write-Host "You may need to configure additional settings manually." -ForegroundColor Yellow

