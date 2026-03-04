# 🚀 Быстрая установка Node.js

## Текущая ситуация

Node.js **не установлен** автоматически, так как требуется интерактивное подтверждение.

## 📥 Что делать сейчас:

### 1. Установить Xcode Command Line Tools

Если появилось окно - нажмите "Установить".
Если нет - выполните:
```bash
xcode-select --install
```

### 2. Установить Node.js

**Самый простой способ:**
1. Откройте https://nodejs.org/
2. Скачайте LTS версию (зеленая кнопка)
3. Установите .pkg файл

### 3. После установки

Откройте **новый терминал** и выполните:

```bash
cd /Users/andrey_efremov/Downloads/runs

# Проверить
node --version
npm --version

# Выполнить следующие шаги
./check_environment.sh
cd mgts-backend/scripts/extract-content && node inventory.js && cd ../../..
./start_strapi.sh
```

## 📚 Подробные инструкции:

- `INSTALL_NODEJS_MANUAL.md` - как установить Node.js
- `NEXT_STEPS_AFTER_NODEJS.md` - что делать после установки
- `INSTALLATION_STATUS.md` - текущий статус

