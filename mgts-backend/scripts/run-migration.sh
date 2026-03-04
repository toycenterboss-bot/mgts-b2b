#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 ЗАПУСК МИГРАЦИИ ВСЕХ СТРАНИЦ УСЛУГ${NC}"
echo "============================================================"

# Получаем директорию скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

echo "📁 Директория проекта: $PROJECT_ROOT"
echo ""

# Шаг 1: Перезапуск сервисов
echo -e "${YELLOW}📋 ШАГ 1: Перезапуск сервисов${NC}"
echo "------------------------------------------------------------"
bash "$SCRIPT_DIR/restart-services.sh"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при перезапуске сервисов${NC}"
    exit 1
fi
echo ""

# Шаг 2: Запуск миграции
echo -e "${YELLOW}📋 ШАГ 2: Запуск миграции всех страниц${NC}"
echo "------------------------------------------------------------"
cd "$BACKEND_DIR" || exit 1
node scripts/migrate-all-service-pages.js

MIGRATION_EXIT_CODE=$?

echo ""
if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА${NC}"
else
    echo -e "${RED}❌ МИГРАЦИЯ ЗАВЕРШИЛАСЬ С ОШИБКАМИ (код: $MIGRATION_EXIT_CODE)${NC}"
fi

exit $MIGRATION_EXIT_CODE


