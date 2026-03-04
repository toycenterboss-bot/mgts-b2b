#!/bin/bash
# Запуск Strapi CMS на macOS/Linux

echo "🚀 Starting Strapi CMS..."
echo ""

# Проверка наличия директории
if [ ! -d "mgts-backend" ]; then
    echo "❌ Error: mgts-backend directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Переход в директорию Strapi
cd mgts-backend

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found"
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found"
    exit 1
fi

# Проверка package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run 'npm install' first"
    exit 1
fi

# Запуск Strapi
echo "✅ Starting Strapi in development mode..."
echo "📝 Admin panel will be available at: http://localhost:1337/admin"
echo ""
npm run develop





