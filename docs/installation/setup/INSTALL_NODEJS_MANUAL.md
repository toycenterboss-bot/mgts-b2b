# Установка Node.js - Ручная инструкция

## ⚠️ Автоматическая установка не удалась

Для установки Node.js требуется интерактивное подтверждение. Выполните следующие шаги вручную:

## 📥 Способ 1: Официальный установщик (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Скачать Node.js
1. Откройте браузер
2. Перейдите на https://nodejs.org/
3. Скачайте **LTS версию** (Long Term Support)
4. Выберите версию для macOS (.pkg файл)

### Шаг 2: Установить
1. Откройте скачанный `.pkg` файл
2. Следуйте инструкциям установщика
3. Введите пароль администратора при запросе

### Шаг 3: Проверить установку
Откройте новый терминал и выполните:
```bash
node --version
npm --version
```

Должно показать версии (например, v20.x.x и 10.x.x)

---

## 📥 Способ 2: Через Homebrew (если установлен)

Если у вас установлен Homebrew:

```bash
brew install node
```

Проверка:
```bash
node --version
npm --version
```

---

## 📥 Способ 3: Через nvm (Node Version Manager)

### Шаг 1: Установить Xcode Command Line Tools
```bash
xcode-select --install
```

Следуйте инструкциям в появившемся окне.

### Шаг 2: Установить nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

### Шаг 3: Перезагрузить терминал или выполнить:
```bash
source ~/.zshrc
```

### Шаг 4: Установить Node.js
```bash
nvm install --lts
nvm use --lts
```

### Шаг 5: Проверить
```bash
node --version
npm --version
```

---

## ✅ После установки Node.js

Выполните следующие команды:

### 1. Проверить окружение
```bash
cd /Users/andrey_efremov/Downloads/runs
./check_environment.sh
```

### 2. Перегенерировать JSON файлы
```bash
cd mgts-backend/scripts/extract-content
node inventory.js
cd ../../..
```

### 3. Запустить Strapi
```bash
./start_strapi.sh
```

---

## 🔍 Проверка установки

После установки Node.js выполните:

```bash
# Проверить версию Node.js
node --version
# Должно быть: v20.x.x или выше

# Проверить версию npm
npm --version
# Должно быть: 9.x.x или выше

# Проверить окружение проекта
cd /Users/andrey_efremov/Downloads/runs
./check_environment.sh
```

---

## ⚠️ Важно

1. После установки Node.js **обязательно перегенерируйте JSON файлы**
2. Используйте **новый терминал** после установки
3. Если команды не работают, проверьте PATH: `echo $PATH`

---

## 📞 Если возникли проблемы

1. Убедитесь, что установлена последняя версия Node.js LTS
2. Проверьте, что Node.js добавлен в PATH
3. Перезапустите терминал после установки
4. Проверьте права доступа: `ls -la $(which node)`





