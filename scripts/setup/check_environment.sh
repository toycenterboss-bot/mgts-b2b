#!/bin/bash
# Проверка окружения для работы с проектом МГТС

echo "🔍 Checking environment for MGTS project..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Not found${NC}"
    echo "   Install: https://nodejs.org/"
fi

# Проверка npm
echo -n "npm: "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ Not found${NC}"
fi

# Проверка Python
echo -n "Python 3: "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ $PYTHON_VERSION${NC}"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    if [[ $PYTHON_VERSION == *"Python 3"* ]]; then
        echo -e "${GREEN}✅ $PYTHON_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  $PYTHON_VERSION (Python 2, recommend Python 3)${NC}"
    fi
else
    echo -e "${RED}❌ Not found${NC}"
    echo "   Install: brew install python3"
fi

# Проверка директорий проекта
echo ""
echo "📁 Project directories:"

if [ -d "SiteMGTS" ]; then
    echo -e "   ${GREEN}✅ SiteMGTS${NC}"
else
    echo -e "   ${RED}❌ SiteMGTS not found${NC}"
fi

if [ -d "mgts-backend" ]; then
    echo -e "   ${GREEN}✅ mgts-backend${NC}"
    
    # Проверка Strapi
    if [ -f "mgts-backend/package.json" ]; then
        echo -e "   ${GREEN}✅ Strapi project found${NC}"
        
        # Проверка node_modules
        if [ -d "mgts-backend/node_modules" ]; then
            echo -e "   ${GREEN}✅ Dependencies installed${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Dependencies not installed${NC}"
            echo "      Run: cd mgts-backend && npm install"
        fi
    else
        echo -e "   ${RED}❌ package.json not found${NC}"
    fi
else
    echo -e "   ${RED}❌ mgts-backend not found${NC}"
fi

# Проверка переменных окружения
echo ""
echo "🔧 Environment variables:"

if [ -z "$SITE_ROOT" ]; then
    echo -e "   ${YELLOW}⚠️  SITE_ROOT not set${NC}"
    echo "      Recommended: export SITE_ROOT=\"$(pwd)/SiteMGTS\""
else
    echo -e "   ${GREEN}✅ SITE_ROOT=$SITE_ROOT${NC}"
fi

# Итоговая информация
echo ""
echo "📝 Quick start commands:"
echo "   Start Strapi:     ./start_strapi.sh"
echo "   Start web server: cd SiteMGTS && python3 -m http.server 8000"
echo "   Check this:       ./check_environment.sh"
echo ""





