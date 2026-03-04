#!/bin/bash
# Настройка переменных окружения для проекта МГТС

echo ""
echo "📝 Настройка переменных окружения"
echo ""

# Установить для текущей сессии
export SITE_ROOT="/Users/andrey_efremov/Downloads/runs/SiteMGTS"
echo "✅ SITE_ROOT установлен для текущей сессии: $SITE_ROOT"
echo ""

# Проверить ~/.zshrc
if [ -f ~/.zshrc ]; then
    if grep -q "SITE_ROOT" ~/.zshrc; then
        echo "⚠️  SITE_ROOT уже есть в ~/.zshrc"
    else
        echo "💡 Добавьте в ~/.zshrc:"
        echo "   export SITE_ROOT=\"/Users/andrey_efremov/Downloads/runs/SiteMGTS\""
        echo ""
        echo "   Затем выполните: source ~/.zshrc"
    fi
else
    echo "💡 Создайте ~/.zshrc и добавьте:"
    echo "   export SITE_ROOT=\"/Users/andrey_efremov/Downloads/runs/SiteMGTS\""
fi
echo ""
