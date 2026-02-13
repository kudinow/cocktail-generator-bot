# Правила проекта — Cocktail Telegram Bot

## Архитектура

- **Точка входа**: `src/bot.ts` — создаёт экземпляры сервисов и регистрирует обработчики
- **Обработчики** (`src/handlers/`): каждый файл экспортирует функцию-регистратор (`handleX`) и отдельные функции-действия (`sendX`) для прямого вызова
- **Сервисы** (`src/services/`): бизнес-логика и работа с данными
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
- НЕ просить пользователя вводить данные на английском

### Двухуровневая модель данных
- **Внутренний слой** (storage, API): хранит и передаёт данные на английском (TheCocktailDB работает только с английскими названиями)
- **Отображение**: всегда переводить на русский через `translateToRussian()` из `helpers.ts`

### Словарь перевода
- Словарь `ingredientMap` находится в `src/utils/helpers.ts`
- При добавлении нового ингредиента в UI — ОБЯЗАТЕЛЬНО добавить перевод в словарь
- `translateToEnglish(ru)` — для сохранения пользовательского ввода
- `translateToRussian(en)` — для отображения данных из API/storage
- Если перевода нет — возвращается оригинальная строка

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

## Запуск

- `npm run dev` — разработка с hot-reload (nodemon + ts-node, `data/` игнорируется)
- `npm run build && npm start` — production сборка
- Требуется `TELEGRAM_BOT_TOKEN` в `.env`
- **Важно**: nodemon настроен с `--ignore data/`, иначе запись в `users.json` вызывает бесконечный цикл перезапусков
