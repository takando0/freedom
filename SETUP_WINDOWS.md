# 🎮 Freedom Broker Game - Запуск на Windows

## 🚀 Быстрый запуск (автоматический)

### Метод 1: Одна команда (рекомендуется)

1. **Откройте PowerShell от имени администратора:**
   - Нажмите `Win + X`
   - Выберите "Windows PowerShell (Admin)" или "Terminal (Admin)"

2. **Скопируйте и выполните эту команду:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; irm https://raw.githubusercontent.com/takando0/freedom/main/scripts/windows_setup_run.ps1 | iex
```

Эта команда:
- ✅ Автоматически установит Git и Node.js (если не установлены)
- ✅ Скачает проект в `C:\freedom`
- ✅ Установит все зависимости
- ✅ Запустит сервер и клиент
- ✅ Откроет правила брандмауэра для доступа из сети

### Метод 2: Запуск скрипта из проекта

Если проект уже скачан:

```powershell
cd C:\freedom
.\scripts\windows_setup_run.ps1
```

---

## 📱 Доступ к приложению

После запуска скрипт покажет IP-адрес и ссылки:

### На самом компьютере:
- 🖥️ **LED экран:** http://localhost:5173/led
- 📱 **Планшет:** http://localhost:5173/tablet
- ⚙️ **Админ панель:** http://localhost:5173/admin

### С других устройств в сети (замените `<IP>` на ваш IP):
- 🖥️ **LED экран:** http://`<IP>`:5173/led
- 📱 **Планшет:** http://`<IP>`:5173/tablet
- ⚙️ **Админ панель:** http://`<IP>`:5173/admin

**Пример:** Если ваш IP `192.168.1.100`, то LED будет доступен по адресу http://192.168.1.100:5173/led

---

## 🛑 Остановка приложения

Просто закройте два окна PowerShell, которые открылись при запуске (они минимизированы).

Или выполните в PowerShell:

```powershell
Stop-Process -Name node -Force
Stop-Process -Name powershell -Force
```

---

## 🔧 Ручная установка (если автоматическая не сработала)

### Шаг 1: Установите Node.js
1. Скачайте с https://nodejs.org/ (LTS версия)
2. Установите с настройками по умолчанию
3. Перезапустите PowerShell

### Шаг 2: Установите Git
1. Скачайте с https://git-scm.com/download/win
2. Установите с настройками по умолчанию
3. Перезапустите PowerShell

### Шаг 3: Клонируйте проект
```powershell
cd C:\
git clone https://github.com/takando0/freedom.git freedom
cd freedom
```

### Шаг 4: Установите зависимости

**Сервер:**
```powershell
cd server
npm install
```

**Клиент:**
```powershell
cd ..\client
npm install
```

### Шаг 5: Запустите приложение

**В первом окне PowerShell (сервер):**
```powershell
cd C:\freedom\server
$env:PORT=3001
node src/index.js
```

**Во втором окне PowerShell (клиент):**
```powershell
cd C:\freedom\client
npm run dev -- --host
```

### Шаг 6: Откройте правила брандмауэра (опционально)

Выполните от имени администратора:

```powershell
netsh advfirewall firewall add rule name="FreedomGame_Server_3001" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="FreedomGame_Client_5173" dir=in action=allow protocol=TCP localport=5173
```

---

## 🔄 Обновление проекта

Если нужно получить последние изменения:

```powershell
cd C:\freedom
git pull
cd server
npm install
cd ..\client
npm install
```

Затем запустите снова скрипт `windows_setup_run.ps1`

---

## 📋 Системные требования

- **ОС:** Windows 10/11
- **RAM:** минимум 4 ГБ
- **Место на диске:** ~500 МБ
- **Node.js:** версия 18.x или выше
- **Git:** любая современная версия

---

## ❓ Решение проблем

### Ошибка "Не удается выполнить сценарии"

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### Порт 3001 или 5173 занят

Найдите и закройте процесс:

```powershell
# Посмотреть, что использует порт
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# Убить процесс по PID (замените 1234 на нужный PID)
taskkill /PID 1234 /F
```

### Git/Node.js не найдены после установки

Перезапустите PowerShell или компьютер.

### Firewall блокирует доступ

Временно отключите брандмауэр или добавьте правила вручную (см. Шаг 6 ручной установки).

### Не могу открыть с планшета

- Убедитесь, что компьютер и планшет в одной сети Wi-Fi
- Проверьте IP-адрес компьютера: `ipconfig`
- Убедитесь, что брандмауэр не блокирует порты 3001 и 5173

---

## 💡 Полезные команды

### Узнать IP-адрес компьютера
```powershell
ipconfig | findstr IPv4
```

### Посмотреть логи сервера
```powershell
cd C:\freedom\server
node src/index.js
```

### Посмотреть логи клиента
```powershell
cd C:\freedom\client
npm run dev -- --host
```

### Очистить данные игры
Просто удалите содержимое файлов в папке `C:\freedom\data\`:
- `players.json` → `[]`
- `global_leaderboard.json` → `[]`

---

## 📞 Поддержка

Если возникли проблемы, проверьте:
1. Версии Node.js: `node --version` (должна быть 18.x или выше)
2. Версию Git: `git --version`
3. Запущены ли оба процесса (сервер и клиент)
4. Открыты ли порты в брандмауэре

---

**Приятной игры! 🎮🚀**

