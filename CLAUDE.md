# Правила проекта — Cocktail Telegram Bot

## Архитектура

- **Точка входа**: `src/bot.ts` — создаёт экземпляры сервисов и регистрирует обработчики
- **Обработчики** (`src/handlers/`): каждый файл экспортирует функцию-регистратор (`handleX`) и отдельные функции-действия (`sendX`) для прямого вызова
- **Сервисы** (`src/services/`): бизнес-логика и работа с данными
  - `cocktailService.ts` — работа с TheCocktailDB API
  - `storageService.ts` — хранение данных пользователей
  - `translationService.ts` — перевод через OpenRouter API (GPT-3.5-turbo)
- **Утилиты** (`src/utils/helpers.ts`): форматирование, перевод, вспомогательные функции
- **Типы** (`src/types/index.ts`): все TypeScript-интерфейсы

### Экспортируемые функции-действия
Каждый обработчик экспортирует функции, которые можно вызвать напрямую из любого места:
- `sendStart(bot, chatId, userId, storage, username?)` — из `startHandler.ts`
- `sendAddIngredient(bot, chatId, userId, storage)` — из `ingredientsHandler.ts`
- `sendMyIngredients(bot, chatId, userId, storage)` — из `ingredientsHandler.ts`
- `sendFindCocktails(bot, chatId, userId, storage, cocktailService)` — из `searchHandler.ts`

## Критические правила Telegram Bot API

### Бот НЕ получает свои собственные сообщения
`bot.sendMessage(chatId, '/command')` из callback-обработчика **НЕ вызовет** `onText` обработчик.
Бот через polling получает только сообщения от пользователей, а не от себя.

**Неправильно:**
```typescript
bot.on('callback_query', async (query) => {
  await bot.sendMessage(chatId, '/start'); // НЕ вызовет onText(/\/start/)
});
```

**Правильно:** вызывать экспортированную функцию-действие напрямую:
```typescript
import { sendStart } from './startHandler';

bot.on('callback_query', async (query) => {
  await sendStart(bot, chatId, userId, storage);
});
```

### Каждый callback-обработчик фильтрует только свои callback_data
Все файлы регистрируют `bot.on('callback_query')`, и Telegram рассылает ВСЕ callback'и всем слушателям. Поэтому каждый обработчик ОБЯЗАН в начале проверять, относится ли `data` к нему, и выходить через `return` для чужих.

```typescript
// searchHandler — обрабатывает только свои
if (data !== 'find_cocktails' && !data.startsWith('show_recipe_')) return;

// ingredientsHandler — обрабатывает только свои
const ownCallbacks = ['add_ingredient', 'my_ingredients', ...];
if (!ownCallbacks.includes(data) && !data.startsWith('add_ing_') && !data.startsWith('remove_ing_')) return;
```

### Всегда вызывать answerCallbackQuery
Каждый обработчик `callback_query` ОБЯЗАН вызвать `bot.answerCallbackQuery(query.id)`, иначе в Telegram будет бесконечный спиннер загрузки.

### Лимит callback_data — 64 байта
`callback_data` в inline-кнопках ограничен 64 байтами. Для длинных значений использовать индексы или короткие ID, а не полные строки.

### Ошибка "message is not modified"
`editMessageText` бросает 400, если новый текст и клавиатура идентичны текущим (например, двойной клик). Оборачивать в try/catch и игнорировать эту ошибку:
```typescript
try {
  await bot.editMessageText(...);
} catch (editError: any) {
  if (!editError?.message?.includes('message is not modified')) throw editError;
}
```

### Telegram Markdown
При использовании `parse_mode: 'Markdown'` экранировать спецсимволы: `_`, `*`, `[`, `]`, `(`, `)` и др. Для команд в тексте: `/add\\_ingredient`.

## UX-паттерны

### Toggle-выбор ингредиентов
- Экран `/add_ingredient` показывает сетку популярных ингредиентов
- Уже выбранные помечаются `✅` в тексте кнопки
- Повторное нажатие убирает ингредиент (toggle)
- Клавиатура обновляется in-place через `editMessageText`
- Функции `buildIngredientKeyboard()` и `buildIngredientMessage()` строят UI с учётом текущего выбора

## Локализация

### Весь пользовательский интерфейс — на русском языке
- Все сообщения бота, кнопки, подсказки, ошибки — только на русском
- Пользователь может вводить названия коктейлей на русском языке
- Все рецепты отображаются полностью на русском (название, категория, инструкции, тип бокала)

### Двухуровневая модель данных
- **Внутренний слой** (storage, API): хранит и передаёт данные на английском (TheCocktailDB работает только с английскими названиями)
- **Отображение**: всегда переводить на русский через `TranslationService` или `translateToRussian()` из `helpers.ts`

### Система перевода (два уровня)

#### 1. Словарный перевод (helpers.ts) — для ингредиентов
- Словарь `ingredientMap` в `src/utils/helpers.ts`
- Быстрый перевод популярных ингредиентов без API-запросов
- `translateToEnglish(ru)` — для сохранения пользовательского ввода
- `translateToRussian(en)` — для отображения данных из API/storage
- Если перевода нет в словаре — возвращается оригинальная строка

#### 2. AI-перевод (TranslationService) — для названий и рецептов
- Использует OpenRouter API с моделью GPT-3.5-turbo
- **Функции:**
  - `translateToEnglish(text)` — перевод названия коктейля с русского на английский перед поиском
  - `translateToRussian(text)` — перевод названия, категории, инструкций, типа бокала на русский
  - `translateBatchToRussian(texts[])` — пакетный перевод для оптимизации
- **Кэширование:** все переводы кэшируются в памяти (Map) для ускорения повторных запросов
- **Конфигурация:** токен `OPENROUTER_API_KEY` в `.env` или fallback значение в `config.ts`
- **Обработка ошибок:** при ошибке API возвращается оригинальный текст без перевода

### Workflow перевода при поиске по названию
1. Пользователь вводит "мохито" → `translationService.translateToEnglish("мохито")` → "Mojito"
2. Поиск в TheCocktailDB API с английским названием
3. Получение рецепта на английском
4. Перевод всех полей рецепта через `translationService.translateToRussian()`
5. Отображение полностью русского рецепта пользователю

## Обработка ошибок

- Все обработчики обёрнуты в try/catch
- В catch для callback: всегда вызывать `answerCallbackQuery` с сообщением об ошибке (в своём try/catch, чтобы не потерять основную ошибку)
- Ошибки логировать через `console.error` с контекстом: `[CALLBACK_ERROR] userId=... data="..."`

## Логирование

- Каждое действие логируется с тегом: `[START]`, `[ADD_INGREDIENT]`, `[MY_INGREDIENTS]`, `[FIND_COCKTAILS]`
- Callback'и: `[INGREDIENT_CB]`, `[SEARCH_CALLBACK]`
- Ошибки: `[CALLBACK_ERROR]`
- Формат: `[TAG] userId=... chatId=... key=value`

## Данные и хранилище

- Данные пользователей хранятся в `data/users.json` (JSON-файл)
- `StorageService` загружает данные при старте и сохраняет при каждом изменении
- Ингредиенты хранятся на английском; сравнение регистронезависимое (`.toLowerCase()`)
- `userStates` (Map) и `userCocktails` (Map) живут в памяти — теряются при перезапуске

## Стиль кода

- TypeScript strict mode
- Async/await для всех операций с Bot API
- Проверять `userId` и `chatId` в начале каждого обработчика
- Конфигурация через `.env` и `src/config/config.ts`
- Не хардкодить лимиты — использовать `config.maxIngredientsPerUser`, `config.maxCocktailsToShow`

## Конфигурация и переменные окружения

Файл `.env` должен содержать:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
COCKTAIL_API_URL=https://www.thecocktaildb.com/api/json/v1/1  # Опционально
```

**Важно:**
- `TELEGRAM_BOT_TOKEN` — обязателен, иначе приложение не запустится
- `OPENROUTER_API_KEY` — обязателен для работы перевода названий коктейлей и рецептов
- Токены хранятся **только в `.env`** — никогда не коммитьте их в Git
- Используйте `.env.example` как шаблон для настройки окружения

## Запуск

- `npm run dev` — разработка с hot-reload (nodemon + ts-node, `data/` игнорируется)
- `npm run build && npm start` — production сборка
- Требуется `TELEGRAM_BOT_TOKEN` в `.env`
- **Важно**: nodemon настроен с `--ignore data/`, иначе запись в `users.json` вызывает бесконечный цикл перезапусков

## Деплой на сервер

Для обновления бота на продакшн-сервере (Яндекс.Облако):
```bash
# 1. Подключиться к серверу
ssh kudinow@158.160.150.22

# 2. Перейти в директорию проекта
cd ~/cocktail-bot

# 3. Получить последние изменения
git pull origin main

# 4. Установить зависимости
npm install

# 5. Собрать проект
npm run build

# 6. Перезапустить через PM2
pm2 restart cocktail-bot

# 7. Проверить логи
pm2 logs cocktail-bot --lines 50
```

**PM2 команды:**
- `pm2 status` — статус всех процессов
- `pm2 restart cocktail-bot` — перезапуск бота
- `pm2 logs cocktail-bot` — просмотр логов в реальном времени
- `pm2 save` — сохранить текущую конфигурацию
- `pm2 startup` — автозапуск при перезагрузке сервера
