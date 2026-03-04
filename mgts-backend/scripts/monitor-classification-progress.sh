#!/bin/bash

# Скрипт для мониторинга прогресса анализа классификации

LOG_FILE="/tmp/full-classification.log"
CLASSIFICATION_FILE="/Users/andrey_efremov/Downloads/runs/temp/services-extraction/content-classification.json"

echo "🔍 Мониторинг прогресса анализа классификации"
echo "========================================"
echo ""

# Проверяем, запущен ли процесс
if pgrep -f "analyze-content-classification.js" > /dev/null; then
    echo "✅ Процесс анализа запущен"
    
    # Показываем последние строки лога
    echo ""
    echo "📋 Последние строки лога:"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "Лог еще не создан"
    
    # Пытаемся определить прогресс
    LAST_LINE=$(tail -1 "$LOG_FILE" 2>/dev/null)
    if echo "$LAST_LINE" | grep -q "\[.*/94\]"; then
        CURRENT=$(echo "$LAST_LINE" | grep -oP '\[\K[0-9]+(?=/94)')
        if [ ! -z "$CURRENT" ]; then
            PROGRESS=$((CURRENT * 100 / 94))
            echo ""
            echo "📊 Прогресс: $CURRENT/94 ($PROGRESS%)"
        fi
    fi
else
    echo "❌ Процесс анализа не запущен"
    
    # Проверяем, есть ли результаты
    if [ -f "$CLASSIFICATION_FILE" ]; then
        echo ""
        echo "✅ Файл результатов найден!"
        
        # Показываем статистику
        TOTAL=$(cat "$CLASSIFICATION_FILE" | grep -o '"totalPages": [0-9]*' | grep -o '[0-9]*')
        if [ ! -z "$TOTAL" ]; then
            echo "📊 Проанализировано страниц: $TOTAL"
        fi
        
        echo ""
        echo "💡 Для генерации отчета выполните:"
        echo "   cd mgts-backend/scripts && node generate-classification-report.js"
    fi
fi

echo ""
echo "========================================"
