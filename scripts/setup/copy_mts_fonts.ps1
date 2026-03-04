# Скрипт для копирования шрифтов МТС в проект
# Запустите этот скрипт из папки SiteMGTS

$fontsSource = "C:\Windows\Fonts"
$fontsDestination = Join-Path $PSScriptRoot "fonts"

# Создаем папку fonts если её нет
if (!(Test-Path $fontsDestination)) {
    New-Item -ItemType Directory -Path $fontsDestination -Force | Out-Null
    Write-Host "Создана папка fonts" -ForegroundColor Green
}

# Список шрифтов для копирования
$fontsToCopy = @(
    "MTSText-Regular.otf",
    "MTSText-Medium.otf",
    "MTSText-Bold.otf",
    "MTSSans-Regular.otf",
    "MTSSans-Medium.otf",
    "MTSSans-Bold.otf"
)

# Копируем каждый шрифт
foreach ($font in $fontsToCopy) {
    $sourcePath = Join-Path $fontsSource $font
    $destPath = Join-Path $fontsDestination $font
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Скопирован: $font" -ForegroundColor Green
    } else {
        Write-Host "Не найден: $font" -ForegroundColor Yellow
    }
}

Write-Host "`nКопирование завершено!" -ForegroundColor Green
Write-Host "Шрифты находятся в: $fontsDestination" -ForegroundColor Cyan

