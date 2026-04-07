# Telegram-бот с Claude AI

Персональный Telegram-бот с несколькими режимами работы на базе Claude (Anthropic) и распознаванием голоса через Whisper (OpenAI).

## Что умеет

| Команда | Режим | Описание |
|---|---|---|
| `/corporate` | Корпоративный переводчик | Переводит сырые мысли/эмоции в корпоративный текст |
| `/balance` | Баланс капитала | Считает стоимость портфеля по данным MOEX в реальном времени |
| `/comfort` | Комфорт-коуч | Коуч по качеству жизни и Кодексу Комфорта |
| `/prime` | Prime-стратег | Анализ власти, корпоративной политики, стратегии |
| `/divs` | — | Дивиденды по портфелю: предстоящие выплаты и итог за год |
| `/menu` | — | Показывает кнопки для смены режима |
| `/reset` | — | Очищает историю диалога |
| `/myid` | — | Показывает ваш Telegram ID (без авторизации) |

- **Голосовые сообщения** — расшифровываются через Whisper и передаются в активный режим Claude
- **Белый список** — бот отвечает только разрешённым пользователям (`ALLOWED_USER_IDS`)
- **История диалога** — хранит последние 20 сообщений на сессию (сбрасывается при смене режима)

## Быстрый старт (5 минут)

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить переменные окружения

Скопируй `.env.example` в `.env` и заполни:

```bash
cp .env.example .env
```

Открой `.env` и вставь токены:

```env
TELEGRAM_TOKEN=       # Токен от @BotFather
ANTHROPIC_API_KEY=    # Ключ с console.anthropic.com
OPENAI_API_KEY=       # Ключ с platform.openai.com (для голосовых)
ALLOWED_USER_IDS=     # Через запятую: 123456789,987654321 (пусто = все)
```

> Узнать свой Telegram ID: написать боту /myid

### 3. Запустить

```bash
npm start
```

Бот готов. Найди его в Telegram и напиши `/start`.

---

## Запуск через PM2 (фоновый режим, автоперезапуск)

```bash
npm install -g pm2

npm run pm2:start    # запустить
npm run pm2:logs     # смотреть логи
npm run pm2:restart  # перезапустить
npm run pm2:stop     # остановить
```

## Запуск через Docker

```bash
docker build -t my-telegram-bot .
docker run -d --env-file .env --name tgbot my-telegram-bot

# Логи:
docker logs -f tgbot
```

---

## Структура файлов

```
my-telegram-bot/
├── bot.js               # Весь код бота
├── .env                 # Секреты (НЕ в git)
├── .env.example         # Шаблон переменных
├── .gitignore           # Исключает .env и node_modules
├── package.json         # Зависимости
├── ecosystem.config.js  # Конфиг PM2
└── Dockerfile           # Сборка Docker-образа
```

## Зависимости

- `node-telegram-bot-api` — Telegram Bot API
- `@anthropic-ai/sdk` — Claude (claude-haiku-4-5)
- `axios` + `form-data` — HTTP-запросы, Whisper, MOEX
- `dotenv` — загрузка `.env`

## Если что-то сломалось

| Проблема | Решение |
|---|---|
| Бот не отвечает | Проверь `TELEGRAM_TOKEN` в `.env` |
| Ошибка Claude API | Проверь `ANTHROPIC_API_KEY`, баланс на console.anthropic.com |
| Голосовые не работают | Проверь `OPENAI_API_KEY` |
| Баланс не считается | MOEX API временно недоступен, попробуй позже |
| "Не авторизован" | Добавь свой ID (узнать через `/myid`) в `ALLOWED_USER_IDS` |
