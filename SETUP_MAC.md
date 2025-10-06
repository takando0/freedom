# Freedom Broker Game - Установка на Mac

## Быстрый старт

### Автоматическая установка и запуск (рекомендуется)

```bash
curl -sSL https://raw.githubusercontent.com/takando0/freedom/main/scripts/mac_setup_run.sh | bash
```

Или клонировать репозиторий и запустить скрипт:

```bash
git clone https://github.com/takando0/freedom.git ~/Freedomgame
cd ~/Freedomgame/scripts
./mac_setup_run.sh
```

## Требования

- **macOS** (любая версия с поддержкой Node.js)
- **Node.js** версии 16 или выше
- **Git**

### Установка требований

#### Node.js

**Через Homebrew:**
```bash
brew install node
```

**Или скачать с официального сайта:**
https://nodejs.org/

#### Git

Обычно уже установлен. Если нет:
```bash
xcode-select --install
```

## Ручная установка

### 1. Клонировать репозиторий

```bash
git clone https://github.com/takando0/freedom.git ~/Freedomgame
cd ~/Freedomgame
```

### 2. Установить зависимости сервера

```bash
cd server
npm install
```

### 3. Установить зависимости клиента

```bash
cd ../client
npm install
```

### 4. Запустить проект

**Терминал 1 - Сервер:**
```bash
cd ~/Freedomgame/server
PORT=3001 node src/index.js
```

**Терминал 2 - Клиент:**
```bash
cd ~/Freedomgame/client
npm run dev -- --host
```

## Доступ к приложению

После запуска приложение будет доступно по следующим адресам:

### На локальном компьютере:
- LED экран: http://localhost:5173/led
- Планшеты: http://localhost:5173/tablet
- Админ-панель: http://localhost:5173/admin

### С других устройств в сети:
Замените `YOUR_IP` на IP-адрес вашего Mac (скрипт покажет его автоматически):
- LED экран: http://YOUR_IP:5173/led
- Планшеты: http://YOUR_IP:5173/tablet
- Админ-панель: http://YOUR_IP:5173/admin

### Узнать свой IP-адрес:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1
```

## Остановка приложения

### Если запущен через скрипт:
```bash
pkill -f "node src/index.js"
pkill -f vite
```

### Если запущен вручную:
Нажмите `Ctrl+C` в каждом терминале.

## Обновление проекта

```bash
cd ~/Freedomgame
git pull origin main
cd server && npm install
cd ../client && npm install
```

Затем перезапустите приложение.

## Очистка данных

Перед началом нового мероприятия можно очистить данные игроков:

```bash
cd ~/Freedomgame/data
echo "[]" > players.json
echo "[]" > global_leaderboard.json
```

Или через админ-панель: нажмите "Очистить таблицу лидеров (видимую)".

## Экспорт данных

Через админ-панель доступны кнопки:
- **Экспорт игроков (JSON)** - все зарегистрированные игроки
- **Экспорт лидерборда (JSON)** - все результаты игр

Или вручную скопируйте файлы:
- `~/Freedomgame/data/players.json`
- `~/Freedomgame/data/global_leaderboard.json`

## Решение проблем

### Порты заняты

```bash
# Освободить порты
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Ошибки зависимостей

```bash
# Переустановить зависимости
cd ~/Freedomgame/server
rm -rf node_modules package-lock.json
npm install

cd ~/Freedomgame/client
rm -rf node_modules package-lock.json
npm install
```

### Проблемы с кэшем в браузере

На устройстве нажмите **Cmd+Shift+R** (Mac) или **Ctrl+Shift+F5** (Windows) для жёсткой перезагрузки страницы.

Или в DevTools (F12):
1. Application → Service Workers → Unregister
2. Application → Clear storage → Clear site data
3. Перезагрузить страницу

## Контакты

Для вопросов и поддержки обращайтесь к разработчику.



