#!/bin/bash

echo "🔄 Перезапуск сервисов..."

# Остановка Strapi (если запущен)
echo "⏹️  Останавливаю Strapi..."
pkill -f "strapi" || echo "   Strapi не запущен"

# Остановка web-server на порту 8001 (если запущен)
echo "⏹️  Останавливаю web-server на порту 8001..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || echo "   Web-server не запущен на порту 8001"

# Небольшая задержка
sleep 2

# Запуск Strapi в фоне
echo "🚀 Запускаю Strapi..."
cd "$(dirname "$0")/.." || exit 1
npm run develop > /dev/null 2>&1 &
STRAPI_PID=$!
echo "   Strapi запущен (PID: $STRAPI_PID)"

# Запуск web-server на порту 8001 в фоне
echo "🚀 Запускаю web-server на порту 8001..."
cd "$(dirname "$0")/../../SiteMGTS" || exit 1
python3 -m http.server 8001 > /dev/null 2>&1 &
WEB_SERVER_PID=$!
echo "   Web-server запущен (PID: $WEB_SERVER_PID)"

# Ждем, пока сервисы запустятся
echo "⏳ Ожидание запуска сервисов (10 секунд)..."
sleep 10

# Проверка доступности Strapi
echo "🔍 Проверяю доступность Strapi..."
for i in {1..10}; do
    if curl -s http://localhost:1337/api > /dev/null 2>&1; then
        echo "✅ Strapi доступен"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "⚠️  Strapi не отвечает, но продолжаю..."
    else
        sleep 1
    fi
done

# Проверка доступности web-server
echo "🔍 Проверяю доступность web-server..."
for i in {1..10}; do
    if curl -s http://localhost:8001 > /dev/null 2>&1; then
        echo "✅ Web-server доступен"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "⚠️  Web-server не отвечает, но продолжаю..."
    else
        sleep 1
    fi
done

echo ""
echo "✅ Сервисы перезапущены"
echo "   Strapi PID: $STRAPI_PID"
echo "   Web-server PID: $WEB_SERVER_PID"
echo ""
echo "Для остановки используйте:"
echo "   kill $STRAPI_PID $WEB_SERVER_PID"


