#!/bin/bash
# Скрипт для запуска миграции через Strapi console
# Использование: ./scripts/migration/run-migration-console.sh

echo "🚀 Запуск миграции типов карточек через Strapi console..."
echo ""
echo "⚠️  ВНИМАНИЕ: Убедитесь, что Strapi запущен в другом терминале"
echo "   (npm run develop)"
echo ""
echo "📝 Выполните следующие команды в консоли Strapi:"
echo ""
echo "   npm run strapi console"
echo ""
echo "   Затем в консоли:"
echo "   const assignCardTypes = require('./scripts/migration/assign-card-types.js');"
echo "   await assignCardTypes({ strapi });"
echo ""




