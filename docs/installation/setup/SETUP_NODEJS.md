# Установка Node.js на macOS

## 🔍 Текущий статус

Node.js **не установлен** на вашем Mac. Он необходим для работы Strapi CMS.

## 📥 Способы установки

### Способ 1: Через официальный сайт (рекомендуется)

1. Перейдите на https://nodejs.org/
2. Скачайте LTS версию (Long Term Support)
3. Установите скачанный `.pkg` файл
4. Проверьте установку:
   ```bash
   node --version
   npm --version
   ```

### Способ 2: Через Homebrew

Если у вас установлен Homebrew:

```bash
# Установить Homebrew (если еще не установлен)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установить Node.js
brew install node

# Проверка
node --version
npm --version
```

### Способ 3: Через nvm (Node Version Manager)

Рекомендуется для разработчиков, которым нужны разные версии Node.js:

```bash
# Установить nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезагрузить терминал или выполнить:
source ~/.zshrc

# Установить последнюю LTS версию
nvm install --lts

# Использовать эту версию
nvm use --lts

# Проверка
node --version
```

## ✅ После установки Node.js

1. **Перегенерировать JSON файлы с путями:**
   ```bash
   cd mgts-backend/scripts/extract-content
   node inventory.js
   cd ../../..
   ```

2. **Проверить окружение:**
   ```bash
   ./check_environment.sh
   ```

3. **Запустить Strapi:**
   ```bash
   ./start_strapi.sh
   ```

## 📋 Требования

- **Node.js:** версия >= 20.0.0 <= 24.x.x (для Strapi 5.33.0)
- **npm:** версия >= 6.0.0

## 🔍 Проверка версии

После установки проверьте версию:

```bash
node --version
# Должно быть: v20.x.x или выше

npm --version
# Должно быть: 9.x.x или выше
```

## ⚠️ Важно

После установки Node.js **обязательно перегенерируйте JSON файлы**, так как они содержат Windows пути (`C:\runs\...`), которые нужно заменить на macOS пути.





