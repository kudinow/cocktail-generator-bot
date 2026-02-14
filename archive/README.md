# Архив — TheCocktailDB API

Этот архив содержит код для работы с TheCocktailDB API, который был заменён на Inshaker.

## Причина архивации

Проект перешёл на использование Inshaker как основного источника данных о коктейлях:
- ✅ Данные на русском языке
- ✅ Измерения в миллилитрах (мл) вместо унций (oz)
- ✅ Локальная база данных (data/inshaker_recipes.json)
- ✅ Не требует внешних API-запросов

## Содержимое архива

### services/cocktailService.ts
Сервис для работы с TheCocktailDB API:
- Поиск коктейлей по ингредиентам
- Поиск коктейлей по названию
- Получение полной информации о коктейле
- Извлечение ингредиентов и мер

## Как вернуть TheCocktailDB API

Если понадобится вернуть функциональность TheCocktailDB:

1. Переместите файлы обратно:
```bash
mv archive/services/cocktailService.ts src/services/
```

2. Раскомментируйте код в `src/bot.ts`:
```typescript
// Раскомментировать импорт и создание экземпляра
import CocktailService from './services/cocktailService';
const cocktailService = new CocktailService();
```

3. Раскомментируйте код в `src/handlers/searchHandler.ts`:
```typescript
// Раскомментировать использование cocktailService
```

4. Добавьте обратно в `.env`:
```
COCKTAIL_API_URL=https://www.thecocktaildb.com/api/json/v1/1
```

## Дата архивации

2026-02-14
