#!/bin/bash
# Скрипт для установки Node.js через официальный установщик

echo "📥 Установка Node.js"
echo ""
echo "Этот скрипт откроет страницу загрузки Node.js в браузере."
echo "Следуйте инструкциям для установки."
echo ""

# URL для скачивания Node.js LTS
NODE_URL="https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg"

echo "🔗 Открываю страницу загрузки Node.js..."
echo "URL: https://nodejs.org/"
echo ""

# Попытка открыть в браузере
if command -v open &> /dev/null; then
    open "https://nodejs.org/"
    echo "✅ Браузер открыт. Скачайте LTS версию (.pkg файл) и установите."
else
    echo "⚠️  Не удалось открыть браузер автоматически."
    echo "   Откройте вручную: https://nodejs.org/"
fi

echo ""
echo "После установки выполните:"
echo "  ./check_environment.sh"
echo "  cd mgts-backend/scripts/extract-content && node inventory.js"
