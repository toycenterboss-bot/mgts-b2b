# Альтернативные способы установки Strapi

## Проблема

При выполнении `npx create-strapi-app@latest mgts-backend --quickstart` появляется ошибка:
```
Эта программа заблокирована групповой политикой. За дополнительными сведениями обращайтесь к системному администратору.
```

Это означает, что выполнение скриптов через `npx` заблокировано политикой безопасности Windows.

## Решения

### Вариант 1: Установка create-strapi-app глобально (рекомендуется)

Вместо использования `npx`, установите `create-strapi-app` глобально:

```powershell
# Установить глобально
npm install -g create-strapi-app

# Затем создать проект
create-strapi-app mgts-backend --quickstart
```

**Преимущества:**
- Обходит ограничения npx
- Устанавливается один раз
- Работает как обычная команда

### Вариант 2: Использование yarn

Если yarn установлен, можно использовать его:

```powershell
# Установить yarn (если не установлен)
npm install -g yarn

# Создать проект через yarn
yarn create strapi-app mgts-backend --quickstart
```

### Вариант 3: Ручная установка Strapi

Если оба предыдущих варианта не работают, можно установить Strapi вручную:

#### Шаг 1: Создать структуру проекта

```powershell
cd C:\mgts-cms
mkdir mgts-backend
cd mgts-backend

# Инициализировать npm проект
npm init -y
```

#### Шаг 2: Установить Strapi

```powershell
# Установить Strapi
npm install strapi@latest

# Установить зависимости для разработки
npm install --save-dev @strapi/strapi
```

#### Шаг 3: Создать структуру вручную

Создать файл `package.json` с правильными скриптами:

```json
{
  "name": "mgts-backend",
  "version": "1.0.0",
  "description": "MGTS CMS Backend",
  "scripts": {
    "develop": "strapi develop",
    "start": "strapi start",
    "build": "strapi build",
    "strapi": "strapi"
  },
  "dependencies": {
    "@strapi/strapi": "^4.15.0",
    "@strapi/plugin-users-permissions": "^4.15.0",
    "@strapi/plugin-i18n": "^4.15.0",
    "@strapi/plugin-upload": "^4.15.0"
  }
}
```

#### Шаг 4: Инициализировать Strapi

```powershell
# Создать базовую структуру
npx strapi@latest new . --quickstart --skip-cloud
```

Если это тоже не работает, используйте следующий вариант.

### Вариант 4: Использование готового шаблона

Скачать готовый шаблон Strapi и настроить его:

```powershell
cd C:\mgts-cms

# Скачать последний релиз Strapi (через браузер или curl)
# Или использовать git (если доступен)
git clone https://github.com/strapi/strapi-starter-nextjs-blog.git mgts-backend
cd mgts-backend

# Установить зависимости
npm install
```

### Вариант 5: Изменение политики выполнения PowerShell

**Внимание:** Требуются права администратора и может быть запрещено политикой.

```powershell
# Запустить PowerShell от имени администратора
# Изменить политику выполнения
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# После установки можно вернуть обратно
Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope CurrentUser
```

### Вариант 6: Использование Docker (если доступен)

Если Docker установлен, можно использовать готовый образ:

```powershell
# Создать docker-compose.yml
# Запустить через Docker
docker-compose up
```

## Рекомендуемый порядок попыток

1. **Попробовать Вариант 1** (установка глобально) - самый простой
2. Если не работает - **Вариант 2** (yarn)
3. Если не работает - **Вариант 3** (ручная установка)
4. Если ничего не помогает - обратиться к системному администратору

## Проверка после установки

После успешной установки проверьте:

```powershell
cd mgts-backend
npm run develop
```

Должен открыться браузер с админ-панелью Strapi на `http://localhost:1337/admin`

## Если ничего не работает

Обратитесь к системному администратору с запросом:
- Разрешить выполнение npm/npx скриптов
- Или предоставить альтернативный способ установки Node.js пакетов
- Или установить Strapi на сервере разработки с соответствующими правами

