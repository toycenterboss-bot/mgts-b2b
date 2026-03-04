# Скрипт проверки окружения для CMS
# Запуск: .\check_environment.ps1

Write-Host "=== Проверка окружения для CMS ===" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# Проверка Node.js
Write-Host "Проверка Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Версия: $nodeVersion" -ForegroundColor Gray
        # Проверка версии (должна быть 18+)
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($majorVersion -lt 18) {
            Write-Host "  Предупреждение: Рекомендуется версия 18.x или выше" -ForegroundColor Yellow
        }
    } else {
        throw "Node.js не найден"
    }
} catch {
    Write-Host " ОШИБКА" -ForegroundColor Red
    Write-Host "  Node.js не установлен" -ForegroundColor Red
    Write-Host "  Установите с https://nodejs.org/" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# Проверка npm
Write-Host "Проверка npm..." -NoNewline
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  Версия: $npmVersion" -ForegroundColor Gray
    } else {
        throw "npm не найден"
    }
} catch {
    Write-Host " ОШИБКА" -ForegroundColor Red
    Write-Host "  npm не установлен (устанавливается вместе с Node.js)" -ForegroundColor Red
    $allOk = $false
}

Write-Host ""

# Проверка Git
Write-Host "Проверка Git..." -NoNewline
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  $gitVersion" -ForegroundColor Gray
    } else {
        throw "Git не найден"
    }
} catch {
    Write-Host " ПРЕДУПРЕЖДЕНИЕ" -ForegroundColor Yellow
    Write-Host "  Git не установлен (опционально, но рекомендуется)" -ForegroundColor Yellow
    Write-Host "  Установите с https://git-scm.com/download/win" -ForegroundColor Yellow
}

Write-Host ""

# Проверка PostgreSQL (опционально)
Write-Host "Проверка PostgreSQL..." -NoNewline
try {
    $psqlVersion = psql --version 2>$null
    if ($psqlVersion) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "  $psqlVersion" -ForegroundColor Gray
        Write-Host "  Информация: Для разработки можно использовать SQLite (входит в Strapi)" -ForegroundColor Cyan
    } else {
        throw "PostgreSQL не найден"
    }
} catch {
    Write-Host " НЕ УСТАНОВЛЕН" -ForegroundColor Gray
    Write-Host "  Для разработки можно использовать SQLite" -ForegroundColor Cyan
    Write-Host "  Для продакшена рекомендуется PostgreSQL" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Результат проверки ===" -ForegroundColor Cyan

if ($allOk) {
    Write-Host "OK: Все необходимые инструменты установлены!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor Cyan
    Write-Host "  1. Перейдите в родительскую директорию: cd .." -ForegroundColor White
    Write-Host "  2. Создайте директорию для CMS: mkdir mgts-cms" -ForegroundColor White
    Write-Host "  3. Перейдите в неё: cd mgts-cms" -ForegroundColor White
    Write-Host "  4. Установите Strapi CLI: npm install -g @strapi/strapi" -ForegroundColor White
    Write-Host "  5. Создайте проект: npx create-strapi-app@latest mgts-backend --quickstart" -ForegroundColor White
} else {
    Write-Host "ОШИБКА: Не все инструменты установлены" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите недостающие инструменты:" -ForegroundColor Yellow
    Write-Host "  - Node.js: https://nodejs.org/" -ForegroundColor White
    Write-Host "  - Git: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host ""
    Write-Host "После установки:" -ForegroundColor Yellow
    Write-Host "  1. Перезапустите терминал/PowerShell" -ForegroundColor White
    Write-Host "  2. Запустите этот скрипт снова: .\check_environment.ps1" -ForegroundColor White
}

Write-Host ""

