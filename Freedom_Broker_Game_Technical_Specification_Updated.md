ТЕХНИЧЕСКОЕ ЗАДАНИЕ
Freedom Broker Game - Интерактивная викторина "Где ты был в 2020?"
1. ОБЩЕЕ ОПИСАНИЕ ПРОЕКТА
Название: Freedom Broker Game
Тип: Интерактивная викторина с использованием планшетов и LED-экрана
Цель: Образовательная игра о ценах акций в 2020 году
Платформа: Веб-приложение (Node.js + Socket.IO)

2. АРХИТЕКТУРА СИСТЕМЫ
2.1 Компоненты системы:
LED Display (/led) - Главный экран для отображения вопросов и результатов
Tablet Interface (/tablet/:playerId) - Интерфейс для участников игры
Admin Panel (/admin) - Панель управления игрой
Backend Server (server.js) - Сервер с игровой логикой и WebSocket
2.2 Технический стек:
Frontend: react, Tailwind CSS стабильной версии
Backend: Node.js, Express.js, Socket.IO
Данные: JSON файлы, localStorage
Стили: Google Fonts (Museum of Sons), адаптивная типографика и адаптивный дизайн с учетом отступов и масштаба
3. ИГРОВАЯ ЛОГИКА
3.1 Структура игры:
Общее количество вопросов: 8
Раунд 1 (вопросы 1-4): Множественный выбор (4 варианта ответа)
Раунд 2 (вопросы 5-8): Ручной ввод цены
Время на ответ: 30 секунд на каждый вопрос
Время на правила: 20 секунд
Промежуточный экран между раундами - переход ко второму раунду с объяснением
3.2 Система начисления очков:
Раунд 1 (Множественный выбор):
Очки начисляются только за правильный ответ: 1 балл.
Неправильные ответы: 0 баллов.
Группировка по близости и частичные баллы не применяются.
Раунд 2 (Ручной ввод):
Очки начисляются индивидуально по точности:
≤ 5% погрешности: 4 очка
≤ 10% погрешности: 3 очка
≤ 20% погрешности: 2 очка
≤ 50% погрешности: 1 очко
> 50% погрешности: 0 очков
4. ЭКРАНЫ И ИНТЕРФЕЙСЫ
4.1 LED Display (Главный экран):
Экраны:
Экран ожидания (waiting)
Заголовок: "ГДЕ ТЫ БЫЛ В 2020?"
Подзаголовок: "Добро пожаловать на викторину от Freedom Broker!"
Иконки подключенных планшетов
Сообщение: "Ожидаем начала игры..."
Экран правил (rules)
Правила игры (20 секунд)
Полный текст правил с обеих языках
Список готовых участников с именами и фамилиями
Автопереход к первому вопросу
Экран вопроса (question)
Информация о компании (название, тикер, текущая цена)
Вопрос на русском и английском языках
Варианты ответов (только для раунда 1)
Круговой таймер (30 секунд)
Индикатор раунда и номера вопроса
Экран результатов (results)
Правильный ответ
Статистика ответов игроков
Мини-таблица лидеров
Автопереход к следующему вопросу (5 секунд)
Промежуточный экран между раундами (round-transition)
Переход от раунда 1 к раунду 2
Объяснение изменений в правилах
Мотивационное сообщение на двух языках
Финальный экран (final)
Итоговая таблица лидеров
Топ-20 игроков
QR-код для скачивания приложения
Информация о призах и дополнительных активностях
Форма сбора контактов — удалена (контакты собираются на планшетах)
Глобальная таблица лидеров (global-leaderboard)
Показывается периодически (каждые 2 минуты на 15 секунд)
Топ-10 игроков всех игр
Только в режиме ожидания
4.2 Tablet Interface (Планшеты):
Экраны:
Экран регистрации (connection)
Форма регистрации:
Имя * (мин. 2 символа)
Фамилия * (мин. 2 символа)
Телефон * (маска: +7 (999) 999-99-99)
Согласие на обработку данных *
Кнопка "ГОТОВ" (активируется после заполнения всех полей)
Уникальность: номер телефона должен быть уникальным; при совпадении — отказ в регистрации
Экран правил-готовности (rules-ready)
Детальные правила игры
Кнопка "С ПРАВИЛАМИ ОЗНАКОМЛЕН, НАЧАТЬ ИГРУ"
Экран ожидания (waiting)
Подтверждение готовности
Количество подключенных игроков
Позиция в очереди
Экран правил (rules)
Краткие правила с обратным отсчетом
Экран вопроса (question)
Раунд 1: 4 кнопки с вариантами ответов
Раунд 2: Поле ввода цены (десятичный разделитель: точка или запятая) + кнопка "Отправить ответ"
Информация о компании
Таймер
Экран результатов (results)
Правильный ответ
Ваш ответ
Полученные очки
Объяснение роста/падения акции
Расчет инвестиционной доходности
Промежуточный экран между раундами (round-transition)
Мотивационное сообщение о переходе ко второму раунду
Финальный экран (final)
Ваша финальная позиция
Общий счет
Мини-таблица лидеров
4.3 Admin Panel:
Функции:
Управление игрой:
Начать игру
Следующий вопрос
Показать результаты
Сбросить игру
Мониторинг:
Статус игры
Текущий вопрос/раунд
Список подключенных игроков
Таблица лидеров в реальном времени
5. ДАННЫЕ О КОМПАНИЯХ И ВОПРОСАХ
5.1 Структура данных компании:
json
{
  "id": 1,
  "name": "Название компании",
  "logo": "ТИКЕР",
  "currentPrice": 171.89,
  "price2020": 28.71,
  "options": [29, 58, 116, 232], // null для раунда 2
  "currency": "USD",
  "growth": 498, // процент роста/падения
  "investment1000": 5980, // во что превратилась бы $1000
  "exchange": "NASDAQ",
  "question": {
    "ru": "Русский текст вопроса",
    "en": "English question text"
  },
  "answer": {
    "ru": "Русский текст ответа с объяснением",
    "en": "English answer with explanation"
  }
}
5.2 Компании в игре:
Раунд 1 (Множественный выбор):
1. Freedom Holding Corp (FRHC)

Текущая цена: $171.89
Цена в 2020: $28.71
Варианты: [29, 58, 116, 232]
Рост: +498%
Вопрос (рус): "Акция компании Freedom Holding Corp сегодня стоит 171,89 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Freedom Holding Corp today is 171.89 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Freedom Holding Corp 5 сентября 2020 года стоила примерно 28,71 USD (NASDAQ: FRHC). Рост акций компании Freedom Holding Corp (NASDAQ: FRHC) составил ≈ +498 %. То есть если бы вы купили акции компании Freedom Holding Corp на $1000 5 лет назад, сейчас у вас было бы примерно $5 980. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Freedom Holding Corp was approximately 28.71 USD (NASDAQ: FRHC). The stock price of Freedom Holding Corp (NASDAQ: FRHC) has increased by ≈ +498%. If you had invested $1,000 in Freedom Holding Corp five years ago, your investment would now be worth approximately $5,980. This is not investment advice. Please remember the risks involved."
2. Netflix Inc. (NFLX)

Текущая цена: $1,238.95
Цена в 2020: $498.31
Варианты: [228, 697, 498, 1103]
Рост: +149%
Вопрос (рус): "Акция компании Netflix Inc. сегодня стоит 1 238,95 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Netflix Inc. today is 1,238.95 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Netflix Inc. 5 сентября 2020 года стоила примерно 498,31 USD (NASDAQ: NFLX). Рост акций компании Netflix Inc. (NASDAQ: NFLX) составил ≈ +149 %. То есть если бы вы купили акции компании Netflix на $1000 5 лет назад, сейчас у вас было бы примерно $2 490. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Netflix Inc. was approximately 498.31 USD (NASDAQ: NFLX). The stock price of Netflix Inc. (NASDAQ: NFLX) has increased by ≈ +149%. If you had invested $1,000 in Netflix five years ago, your investment would now be worth approximately $2,490. This is not investment advice. Please remember the risks involved."
3. Microsoft Corporation (MSFT)

Текущая цена: $520.17
Цена в 2020: $215.33
Варианты: [272, 215, 435, 321]
Рост: +141%
Вопрос (рус): "Акция компании Microsoft Corporation сегодня стоит 520,17 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Microsoft Corporation today is 520.17 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Microsoft Corporation 5 сентября 2020 года стоила примерно 215,33 USD (NASDAQ: MSFT). Рост акций компании Microsoft (NASDAQ: MSFT) составил ≈ +141 %. То есть если бы вы купили акции компании Microsoft на $1000 5 лет назад, сейчас у вас было бы примерно $2 410. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Microsoft Corporation was approximately 215.33 USD (NASDAQ: MSFT). The stock price of Microsoft (NASDAQ: MSFT) has increased by ≈ +141%. If you had invested $1,000 in Microsoft five years ago, your investment would now be worth approximately $2,410. This is not investment advice. Please remember the risks involved."
4. Nike Inc. (NKE)

Текущая цена: $76.97
Цена в 2020: $118.01
Варианты: [85, 118, 53, 33]
Падение: -35%
Вопрос (рус): "Акция компании Nike Inc. сегодня стоит 76,97 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Nike Inc. today is 76.97 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Nike Inc. 5 сентября 2020 года стоила примерно 118,01 USD (NYSE: NKE). Рост акций компании Nike (NYSE: NKE) составил ≈ –35 % (падение). То есть если бы вы купили акции компании Nike на $1000 5 лет назад, сейчас у вас было бы примерно $650. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Nike Inc. was approximately 118.01 USD (NYSE: NKE). The stock price of Nike (NYSE: NKE) has declined by ≈ –35%. If you had invested $1,000 in Nike five years ago, your investment would now be worth approximately $650. This is not investment advice. Please remember the risks involved."
Раунд 2 (Ручной ввод):
5. Uber Technologies Inc. (UBER)

Текущая цена: $92.60
Цена в 2020: $33.30
Рост: +178%
Вопрос (рус): "Акция компании Uber Technologies Inc. сегодня стоит 92,60 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Uber Technologies Inc. today is 92.60 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Uber Technologies Inc. 5 сентября 2020 года стоила примерно 33,30 USD (NYSE: UBER). Рост акций компании Uber (NYSE: UBER) составил ≈ +178 %. То есть если бы вы купили акции компании Uber на $1000 5 лет назад, сейчас у вас было бы примерно $2 780. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Uber Technologies Inc. was approximately 33.30 USD (NYSE: UBER). The stock price of Uber (NYSE: UBER) has increased by ≈ +178%. If you had invested $1,000 in Uber five years ago, your investment would now be worth approximately $2,780. This is not investment advice. Please remember the risks involved."
6. Meta Platforms Inc. (META)

Текущая цена: $785.23
Цена в 2020: $271.39
Рост: +189%
Вопрос (рус): "Акция компании Meta Platforms Inc. (бывш. Facebook) сегодня стоит 785,23 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Meta Platforms Inc. (formerly Facebook) today is 785.23 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Meta Platforms Inc. 5 сентября 2020 года стоила примерно 271,39 USD (NASDAQ: META). Рост акций компании Meta (NASDAQ: META) составил ≈ +189 %. То есть если бы вы купили акции компании Meta на $1000 5 лет назад, сейчас у вас было бы примерно $2 890. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Meta Platforms Inc. was approximately 271.39 USD (NASDAQ: META). The stock price of Meta (NASDAQ: META) has increased by ≈ +189%. If you had invested $1,000 in Meta five years ago, your investment would now be worth approximately $2,890. This is not investment advice. Please remember the risks involved."
7. Nestlé S.A. (NSRGY)

Текущая цена: $131.45
Цена в 2020: $103.25
Рост: +27%
Вопрос (рус): "Акция компании Nestlé S.A. сегодня стоит 131,45 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Nestlé S.A. today is 131.45 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Nestlé S.A. 5 сентября 2020 года стоила примерно 103,25 USD (OTC: NSRGY). Рост акций компании Nestlé (OTC: NSRGY) составил ≈ +27 %. То есть если бы вы купили акции компании Nestlé на $1000 5 лет назад, сейчас у вас было бы примерно $1 270. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Nestlé S.A. was approximately 103.25 USD (OTC: NSRGY). The stock price of Nestlé (OTC: NSRGY) has increased by ≈ +27%. If you had invested $1,000 in Nestlé five years ago, your investment would now be worth approximately $1,270. This is not investment advice. Please remember the risks involved."
8. Pfizer Inc. (PFE)

Текущая цена: $25.14
Цена в 2020: $36.35
Падение: -31%
Вопрос (рус): "Акция компании Pfizer Inc. сегодня стоит 25,14 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?"
Вопрос (eng): "The share price of Pfizer Inc. today is 25.14 USD. What do you think the share price of this company was in September 2020?"
Ответ (рус): "Акция компании Pfizer Inc. 5 сентября 2020 года стоила примерно 36,35 USD (NYSE: PFE). Рост акций компании Pfizer (NYSE: PFE) составил ≈ –31 % (падение). То есть если бы вы купили акции компании Pfizer на $1000 5 лет назад, сейчас у вас было бы примерно $690. Не инвестиционная рекомендация. Помните о рисках."
Ответ (eng): "On September 5, 2020, the share price of Pfizer Inc. was approximately 36.35 USD (NYSE: PFE). The stock price of Pfizer (NYSE: PFE) has declined by ≈ –31%. If you had invested $1,000 in Pfizer five years ago, your investment would now be worth approximately $690. This is not investment advice. Please remember the risks involved."
6. СИСТЕМА СОСТОЯНИЙ
6.1 Состояния игры (gameState.status):
waiting - Ожидание игроков
rules - Показ правил (20 сек)
question - Активный вопрос (30 сек)
results - Результаты вопроса (5 сек)
round-transition - Переход между раундами
final - Финальные результаты
6.2 Структура gameState:
javascript
{
  status: 'waiting', // текущий статус
  currentQuestion: 0, // номер вопроса (0-7)
  round: 1, // текущий раунд (1-2)
  timer: 30, // секунды до окончания
  timerStartTime: timestamp, // время запуска таймера
  players: {}, // подключенные игроки
  answers: {}, // ответы на текущий вопрос
  scores: {}, // общие очки игроков
  leaderboard: [] // текущая таблица лидеров
}
7. ТЕКСТЫ ЭКРАНОВ
7.1 Экран правил (LED):
Русский:

ДОБРО ПОЖАЛОВАТЬ НА ВИКТОРИНУ ОТ FREEDOM BROKER!

Мы покажем вам текущую цену акции известной компании.
Ваша задача — угадать цену этой акции в 2020 году.
Начисление баллов:
Раунд 1 — 1 балл только за правильный ответ (без частичных баллов).
Раунд 2 — чем ближе к правильному ответу, тем больше баллов.

На ответ у вас будет 30 секунд.

Игра состоит из 2 раундов, в каждом — по 4 вопроса:
Первые 4 вопроса — простые: нужно выбрать правильный вариант из 4 предложенных.

Следующие 4 вопроса — сложнее: нужно вручную вписать предполагаемую цену акции в долларах США.

Если у вас останутся вопросы, вы всегда можете обратиться к нашему специалисту.
Когда будете готовы, нажмите на планшете кнопку «Готов к Игре».

УДАЧИ И СПАСИБО ЗА УЧАСТИЕ!
English:

WELCOME TO THE FREEDOM BROKER QUIZ!

We will show you the current share price of a well-known company.
Your task is to guess the price of this stock in 2020.
The closer your guess is to the correct answer — the more points you earn.

You will have 30 seconds to answer. The game consists of 2 rounds, each with 4 questions.
Round 1 — 1 point only for the correct answer (no partial credit).
Round 2 — the closer your guess is to the correct answer, the more points you earn.

If you have any questions, please contact our specialist.
Now you can press the "Ready to Play" button on your tablet.

GOOD LUCK AND THANK YOU FOR PARTICIPATING!
7.2 Промежуточный экран между раундами:
Русский:

Хорошая работа, но впереди испытание посерьёзнее.
Теперь вы должны будете вводить ответ сами, варианты ответа предлагаться не будут.
English:

Great job, but now comes a tougher challenge.
From this point on, you'll need to enter the answers yourself — no multiple-choice options will be provided.
7.3 Финальный экран:
Русский:

🏆 Топ-10 победителей викторины получат специальные призы в конце мероприятия!
Мы свяжемся с вами по указанному номеру телефона.

✨ Спасибо, что приняли участие в нашей игре!
Хотите глубже погрузиться в мир акций и сделать так, чтобы ваши деньги работали на вас?
Переходите по QR-коду и скачивайте наше приложение 📲.

👔 В нашей зоне вас также ждёт инвестиционный консультант — парень в костюме. Он поможет вам сделать первые шаги в мире инвестиций и ответит на все вопросы.

📸 А ещё приглашаем вас в фотозону: сделайте тематическое фото у ИИ-селфи-станции, например фото с Тимуром Турловым, и насладитесь кофе или чаем в подарок за ваш интерес.
English:

🏆 The Top 10 winners of the quiz will receive special prizes at the end of the event!
We will contact you using the phone number you provided.

✨ Thank you for taking part in our game!
Would you like to dive deeper into the world of stocks and make your money work for you?
Simply scan the QR code and download our app 📲.

👔 In our zone, you'll also find an investment consultant — the gentleman in a suit. He will help you take your first steps into the world of investing and answer all your questions.

📸 And don't miss our photo zone: take a themed picture at the AI-powered selfie station with Timur Turlov and enjoy a complimentary coffee or tea as a token of our appreciation.
8. ПЕРСИСТЕНТНОСТЬ ДАННЫХ
8.1 LocalStorage (планшеты):
freedomBroker_playerId - уникальный ID игрока
freedomBroker_playerName - имя игрока для переподключения
8.2 Файлы данных:
data/companies.json - данные о компаниях и вопросах
data/global_leaderboard.json - глобальная таблица лидеров
data/players.json - список зарегистрированных игроков (имя, фамилия, телефон, согласие, timestamp); номера телефонов уникальны
8.3 Глобальная таблица лидеров:
javascript
[
  {
    playerName: "Имя игрока",
    score: 24, // общий счет за игру
    date: "2024-01-15T10:30:00.000Z",
    timestamp: 1705315800000
  }
]
Примечание: глобальная таблица лидеров агрегируется из всех завершённых игровых сессий и обновляется по окончании каждой игры.
9. ДИЗАЙН И СТИЛИ
9.1 Цветовая схема:
Темная тема
Акцентные цвета: зелёный #51AF3D, тёмно-зелёный #0F5431, белый #FFFFFF
9.2 Типографика:
Основной шрифт: 'Museum of Sons' (Google Fonts)
Адаптивные размеры: clamp() функции для всех текстов
Веса: 300, 400, 500, 600, 700, 900
9.3 Принципы дизайна:
Минималистичный современный дизайн
Адаптивная типографика для всех экранов
Минимальные плавные анимации, без перегруза; без теней и свечений
Использование SVG иконок вместо эмодзи
Трейдинговый стиль интерфейса
10. ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
10.1 Производительность:
Синхронизация таймеров между всеми клиентами
Обработка переподключений игроков
Валидация всех входящих данных
Graceful handling отключений
10.2 Безопасность:
Санитизация имен игроков (удаление HTML тегов)
Валидация номеров телефонов
Ограничения на длину текстовых полей
Проверка корректности игрового состояния
10.3 Совместимость:
Современные браузеры (Chrome, Safari, Firefox)
Мобильные устройства (планшеты)
Большие экраны (LED дисплеи 4K)
11. API ENDPOINTS
11.1 HTTP Routes:
GET / - Главная страница (LED)
GET /led - LED дисплей
GET /tablet/:playerId - Интерфейс планшета
GET /admin - Панель администратора
GET /api/companies - Данные компаний
GET /api/global-leaderboard - Глобальная таблица лидеров
GET /api/players - Экспорт списка игроков (для выгрузки контактов)
11.2 Static Assets:
GET /logo.svg - Логотип
GET /icon.svg - Иконка
GET /data/* - Файлы данных
11.3 WebSocket Events:
Client → Server:
registerPlayer - Регистрация игрока
submitAnswer - Отправка ответа
adminCommand - Команды администратора
Server → Client:
gameState - Обновление состояния игры
timerUpdate - Обновление таймера
gameError - Ошибки игры
12. ЛОГИКА ПЕРЕПОДКЛЮЧЕНИЙ
12.1 Сценарии:
Обновление страницы планшета - автоматическое восстановление сессии
Потеря сети - повторное подключение с сохранением состояния
Закрытие/открытие браузера - восстановление по localStorage
12.2 Механизм:
Сохранение playerId и playerName в localStorage
При загрузке страницы - попытка восстановления
Обновление socketId на сервере при переподключении
Автоматический переход к актуальному экрану игры
13. ВАЛИДАЦИЯ И ОШИБКИ
13.1 Валидация форм:
Имя/Фамилия: минимум 2 символа, максимум 30
Телефон: строго 11 цифр, начинается с 7, маска +7 (999) 999-99-99
Согласие: обязательная галочка
Уникальность телефона: регистрация отклоняется, если номер уже существует в базе
13.2 Игровая валидация:
Проверка существования игрока при отправке ответа
Валидация корректности ответов (числа для раунда 2)
Поддержка десятичного разделителя: '.' и ','; нормализация на сервере перед расчётом погрешности
Проверка временных рамок (не принимать ответы после таймера)
13.3 Обработка ошибок:
Уведомления пользователям о проблемах
Логирование ошибок на сервере
Graceful degradation при потере соединения
14. ОСНОВНЫЕ ОТЛИЧИЯ ОТ ПЕРВОНАЧАЛЬНОЙ ВЕРСИИ ТЗ
14.1 Изменения в компаниях и данных:
Uber: Обновлена текущая цена с $82.14 на $92.60, цена 2020 года изменена с $36.73 на $33.30
Заменены компании в раунде 2:
Zoom заменена на Meta Platforms Inc.
Tesla заменена на Nestlé S.A.
Удален из раунда 2: Pfizer перенесен в 8-й вопрос
14.2 Новые экраны и функциональность:
Промежуточный экран между раундами - отсутствовал в первоначальном ТЗ
Расширенный финальный экран с информацией о:
Призах для топ-10 участников
QR-коде для скачивания приложения
Инвестиционном консультанте
Фотозоне с ИИ-селфи-станцией
14.3 Дополнительные тексты:
Полные тексты правил игры на двух языках
Тексты промежуточного экрана между раундами
Расширенные финальные экраны с призовой информацией
14.4 Обновленная структура данных:
Все вопросы и ответы теперь включают полные тексты на русском и английском
Добавлены точные варианты ответов для множественного выбора
Обновлены расчеты доходности инвестиций
14.5 Обновления правил и дизайна (текущие):
Раунд 1: очки только за правильный ответ (1 балл), без близости
Раунд 2: допускается десятичный разделитель точка или запятая
Уникальность телефона: запрет на дубликаты при регистрации; имена/фамилии могут совпадать
Форма контактов на финальном экране не используется; сбор контактов на планшете с экспортом
Статические ассеты: использовать файлы /logo.svg и /icon.svg из корня сайта
Цвета: акцент зелёный #51AF3D и тёмно-зелёный #0F5431; тёмная тема
Дизайн: минимальные плавные анимации
Ограничения: одна игровая сессия за запуск (мульти-игры не требуются)
15. ФАЙЛ COMPANIES.JSON (СТРУКТУРА)
json
{
  "companies": [
    {
      "id": 1,
      "name": "Freedom Holding Corp",
      "logo": "FRHC",
      "currentPrice": 171.89,
      "price2020": 28.71,
      "options": [29, 58, 116, 232],
      "currency": "USD",
      "growth": 498,
      "investment1000": 5980,
      "exchange": "NASDAQ",
      "round": 1,
      "question": {
        "ru": "Акция компании Freedom Holding Corp сегодня стоит 171,89 USD. Как вы думаете, сколько стоила акция данной компании в сентябре 2020 года?",
        "en": "The share price of Freedom Holding Corp today is 171.89 USD. What do you think the share price of this company was in September 2020?"
      },
      "answer": {
        "ru": "Акция компании Freedom Holding Corp 5 сентября 2020 года стоила примерно 28,71 USD (NASDAQ: FRHC). Рост акций компании Freedom Holding Corp (NASDAQ: FRHC) составил ≈ +498 %. То есть если бы вы купили акции компании Freedom Holding Corp на $1000 5 лет назад, сейчас у вас было бы примерно $5 980. Не инвестиционная рекомендация. Помните о рисках.",
        "en": "On September 5, 2020, the share price of Freedom Holding Corp was approximately 28.71 USD (NASDAQ: FRHC). The stock price of Freedom Holding Corp (NASDAQ: FRHC) has increased by ≈ +498%. If you had invested $1,000 in Freedom Holding Corp five years ago, your investment would now be worth approximately $5,980. This is not investment advice. Please remember the risks involved."
      }
    }
    // ... остальные компании
  ]
}
ЗАКЛЮЧЕНИЕ
Данное техническое задание представляет полную спецификацию интерактивной викторины Freedom Broker Game с учетом всех требований клиента. Включены все необходимые компоненты: игровая логика, интерфейсы, данные о компаниях, тексты на двух языках, и техническая архитектура для реализации проекта.

