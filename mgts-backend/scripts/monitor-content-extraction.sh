#!/bin/bash

# Скрипт для мониторинга прогресса извлечения контента

LOG_FILE="/tmp/extract-all-content.log"
OUTPUT_DIR="/Users/andrey_efremov/Downloads/runs/temp/services-extraction/pages-content"
INDEX_FILE="$OUTPUT_DIR/index.json"

echo "🔍 Мониторинг извлечения контента"
echo "========================================"
echo ""

# Проверяем, запущен ли процесс
if pgrep -f "extract-all-pages-content.js" > /dev/null; then
    echo "✅ Процесс извлечения запущен"
    
    # Показываем последние строки лога
    echo ""
    echo "📋 Последние строки лога:"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "Лог еще не создан"
    
    # Пытаемся определить прогресс
    LAST_LINE=$(tail -1 "$LOG_FILE" 2>/dev/null)
    if echo "$LAST_LINE" | grep -q "\[.*\]"; then
        CURRENT=$(echo "$LAST_LINE" | grep -oP '\[\K[0-9]+(?=/)' | head -1)
        TOTAL=$(echo "$LAST_LINE" | grep -oP '/\K[0-9]+' | head -1)
        if [ ! -z "$CURRENT" ] && [ ! -z "$TOTAL" ]; then
            PROGRESS=$((CURRENT * 100 / TOTAL))
            echo ""
            echo "📊 Прогресс: $CURRENT/$TOTAL ($PROGRESS%)"
        fi
    fi
    
    # Считаем сохраненные файлы
    if [ -d "$OUTPUT_DIR" ]; then
        SAVED=$(ls -1 "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
        echo "📁 Сохранено файлов: $SAVED"
    fi
else
    echo "❌ Процесс извлечения не запущен"
    
    # Проверяем, есть ли результаты
    if [ -f "$INDEX_FILE" ]; then
        echo ""
        echo "✅ Извлечение завершено!"
        
        # Показываем статистику
        if command -v python3 &> /dev/null; then
            TOTAL=$(python3 -c "import json; data = json.load(open('$INDEX_FILE')); print(data.get('totalPages', 0))" 2>/dev/null)
            SUCCESS=$(python3 -c "import json; data = json.load(open('$INDEX_FILE')); print(data.get('successful', 0))" 2>/dev/null)
            FAILED=$(python3 -c "import json; data = json.load(open('$INDEX_FILE')); print(data.get('failed', 0))" 2>/dev/null)
            
            if [ ! -z "$TOTAL" ]; then
                echo "📊 Статистика:"
                echo "   Всего страниц: $TOTAL"
                echo "   Успешно: $SUCCESS"
                echo "   Ошибок: $FAILED"
            fi
        fi
        
        # Считаем файлы
        if [ -d "$OUTPUT_DIR" ]; then
            FILES=$(ls -1 "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
            echo "📁 Файлов сохранено: $FILES"
        fi
    fi
fi

echo ""
echo "========================================"
