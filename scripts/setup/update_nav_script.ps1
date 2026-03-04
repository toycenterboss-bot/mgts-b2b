# Скрипт для обновления навигации на всех страницах третьего уровня

# Путь к корню
$rootPath = "SiteMGTS"

# Шаблон меню для уровня 3 (business/*/*/index.html)
$navTemplate = @"
                <nav class="nav" id="mainNav">
                    <a href="../../../index.html" class="nav-link">Главная</a>
                    <a href="../index.html" class="nav-link">Услуги</a>
                    <a href="../../index.html" class="nav-link">Бизнес</a>
                    <a href="../../../operators/index.html" class="nav-link">Операторы</a>
                    <a href="../../../developers/index.html" class="nav-link">Застройщики</a>
                    <a href="../../../partners/index.html" class="nav-link">Партнеры</a>
                    <a href="../../../government/index.html" class="nav-link">Госсектор</a>
                    <a href="../../../about/index.html" class="nav-link">О компании</a>
                    <a href="../../../contacts/index.html" class="nav-link">Контакты</a>
                    <a href="tel:+749563600636" class="nav-link">📞 8 800 250-0-250</a>
                </nav>
"@

# Найти все index.html на уровне 3
$files = Get-ChildItem -Path $rootPath\business -Recurse -Filter "index.html" | Where-Object {
    $relativePath = $_.FullName.Replace((Get-Item $rootPath).FullName + '\', '')
    $depth = ($relativePath -split '\\').Count
    $depth -eq 4  # business/category/service/index.html
}

foreach ($file in $files) {
    Write-Host "Processing: $($file.FullName)"
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Найти существующее меню и заменить
    if ($content -match '(?s)<nav class="nav"[^>]*>.*?</nav>') {
        $content = $content -replace '(?s)<nav class="nav"[^>]*>.*?</nav>', $navTemplate
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  Updated: $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  No nav found: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "`nDone!" -ForegroundColor Green

