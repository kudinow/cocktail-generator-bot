import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { InshakerRecipe, InshakerIngredient } from '../src/types';

const BASE_URL = 'https://ru.inshaker.com';
const OUTPUT_FILE = path.join(__dirname, '../data/inshaker_recipes.json');
const PARSED_IDS_FILE = path.join(__dirname, '../data/parsed_ids.json');
const FAILED_IDS_FILE = path.join(__dirname, '../data/failed_ids.json');
const TO_PARSE_FILE = path.join(__dirname, '../data/to_parse.json');
const DELAY_MS = 1000; // Задержка между запросами (1 сек)

/** Интерфейс для записи о неудачной попытке парсинга */
interface FailedParseAttempt {
  id: number;
  error: string;
  errorCode?: number;
  attemptedAt: string;
}

/** Извлекает ID коктейля из ссылки или возвращает число */
function extractCocktailId(input: string | number): number | null {
  if (typeof input === 'number') {
    return input;
  }

  // Проверяем, является ли строка числом
  const numMatch = input.match(/^\d+$/);
  if (numMatch) {
    return parseInt(input, 10);
  }

  // Извлекаем ID из ссылки: https://ru.inshaker.com/cocktails/724
  const urlMatch = input.match(/\/cocktails\/(\d+)/);
  if (urlMatch) {
    return parseInt(urlMatch[1], 10);
  }

  return null;
}

/** Расширяет диапазон или возвращает одиночный ID */
function expandRange(input: string | number): number[] {
  if (typeof input === 'number') {
    return [input];
  }

  // Проверяем диапазон: "100-150"
  const rangeMatch = input.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);

    if (start > end) {
      console.warn(`⚠️ Некорректный диапазон: ${input} (начало больше конца)`);
      return [];
    }

    // Создаём массив чисел от start до end
    const range: number[] = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }

  // Если не диапазон, пытаемся извлечь одиночный ID
  const id = extractCocktailId(input);
  return id !== null ? [id] : [];
}

// Утилита для задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Результат парсинга рецепта */
interface ParseResult {
  success: boolean;
  recipe?: InshakerRecipe;
  error?: string;
  errorCode?: number;
}

// Парсинг одного рецепта
async function parseRecipe(cocktailId: number): Promise<ParseResult> {
  try {
    console.log(`Парсинг коктейля ID ${cocktailId}...`);

    const url = `${BASE_URL}/cocktails/${cocktailId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // Попытка извлечь JSON-LD данные
    const jsonLdScript = $('script[type="application/ld+json"]').html();

    let recipe: InshakerRecipe | null;
    if (jsonLdScript) {
      recipe = parseFromJsonLd(cocktailId, jsonLdScript, $);
    } else {
      // Fallback: парсинг из HTML
      recipe = parseFromHtml(cocktailId, $);
    }

    if (recipe) {
      return { success: true, recipe };
    } else {
      return {
        success: false,
        error: 'Не удалось извлечь данные из HTML/JSON-LD',
      };
    }

  } catch (error: any) {
    const errorCode = error.response?.status;
    const errorMessage = error.response?.status
      ? `Request failed with status code ${error.response.status}`
      : error.message;

    console.error(`❌ Ошибка парсинга коктейля ${cocktailId}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }
}

// Парсинг из JSON-LD (Schema.org)
function parseFromJsonLd(
  cocktailId: number,
  jsonLdString: string,
  $: any
): InshakerRecipe | null {
  try {
    const jsonLd = JSON.parse(jsonLdString);

    // Извлечение ингредиентов
    const ingredients: InshakerIngredient[] = [];
    if (Array.isArray(jsonLd.recipeIngredient)) {
      jsonLd.recipeIngredient.forEach((ing: string) => {
        // Разделить на количество и название
        // Пример: "50 мл Silver tequila"
        const match = ing.match(/^([\d.,]+\s*(?:мл|г|шт\.?|капл\.?)?)\s+(.+)$/i);
        if (match) {
          ingredients.push({
            amount: match[1].trim(),
            name: match[2].trim(),
          });
        } else {
          ingredients.push({
            amount: '',
            name: ing.trim(),
          });
        }
      });
    }

    // Извлечение инструкций
    const instructions: string[] = [];
    if (Array.isArray(jsonLd.recipeInstructions)) {
      jsonLd.recipeInstructions.forEach((step: any) => {
        if (typeof step === 'string') {
          instructions.push(step);
        } else if (step.text) {
          instructions.push(step.text);
        }
      });
    }

    // Дополнительные данные из HTML
    const category = $('.cocktail-about .param:contains("Категория")').next().text().trim() || '';
    const glass = $('.cocktail-about .param:contains("Бокал")').next().text().trim() || '';
    const tagsText = $('.cocktail-about .param:contains("Теги")').next().text().trim() || '';
    const tags = tagsText ? tagsText.split(',').map((t: string) => t.trim()) : [];

    // Определение алкогольности
    const alcoholic = !tags.includes('Безалкогольный');

    // Рейтинг
    const ratingText = $('.rating .value').text().trim();
    const rating = ratingText ? parseFloat(ratingText) : undefined;

    return {
      id: cocktailId,
      name: jsonLd.name || '',
      image: jsonLd.image || '',
      category,
      tags,
      glass,
      ingredients,
      instructions,
      rating,
      alcoholic,
      source: 'inshaker',
      parsedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`Ошибка парсинга JSON-LD для ID ${cocktailId}:`, error.message);
    return null;
  }
}

// Fallback: парсинг из HTML
function parseFromHtml(cocktailId: number, $: any): InshakerRecipe | null {
  try {
    const name = $('h1.cocktail-name').text().trim();
    const image = $('.cocktail-photo img').attr('src') || '';
    const category = $('.cocktail-about .param:contains("Категория")').next().text().trim() || '';
    const glass = $('.cocktail-about .param:contains("Бокал")').next().text().trim() || '';

    // Ингредиенты
    const ingredients: InshakerIngredient[] = [];
    $('.ingredients .ingredient').each((_: any, el: any) => {
      const amount = $(el).find('.amount').text().trim();
      const ingredientName = $(el).find('.name').text().trim();
      if (ingredientName) {
        ingredients.push({ amount, name: ingredientName });
      }
    });

    // Инструкции
    const instructions: string[] = [];
    $('.steps .step').each((_: any, el: any) => {
      const stepText = $(el).text().trim();
      if (stepText) {
        instructions.push(stepText);
      }
    });

    // Теги
    const tags: string[] = [];
    $('.tags .tag').each((_: any, el: any) => {
      tags.push($(el).text().trim());
    });

    const alcoholic = !tags.includes('Безалкогольный');

    return {
      id: cocktailId,
      name,
      image: image.startsWith('http') ? image : BASE_URL + image,
      category,
      tags,
      glass,
      ingredients,
      instructions,
      alcoholic,
      source: 'inshaker',
      parsedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`Ошибка HTML-парсинга для ID ${cocktailId}:`, error.message);
    return null;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Запуск парсера Inshaker с системой таблиц\n');

  // 1. Загружаем существующие рецепты
  let existingRecipes: InshakerRecipe[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      existingRecipes = JSON.parse(fileContent);
      console.log(`📚 Загружено ${existingRecipes.length} рецептов из базы`);
    } catch (error) {
      console.warn('⚠️ Не удалось загрузить существующие рецепты, создаём новый файл');
    }
  }

  // 2. Загружаем таблицы
  let parsedIds: number[] = [];
  let failedIds: FailedParseAttempt[] = [];
  let toParse: (string | number)[] = [];

  if (fs.existsSync(PARSED_IDS_FILE)) {
    parsedIds = JSON.parse(fs.readFileSync(PARSED_IDS_FILE, 'utf-8'));
  }
  if (fs.existsSync(FAILED_IDS_FILE)) {
    failedIds = JSON.parse(fs.readFileSync(FAILED_IDS_FILE, 'utf-8'));
  }
  if (fs.existsSync(TO_PARSE_FILE)) {
    toParse = JSON.parse(fs.readFileSync(TO_PARSE_FILE, 'utf-8'));
  }

  console.log(`📊 Статус таблиц:`);
  console.log(`   ✅ Успешно спарсено: ${parsedIds.length} ID`);
  console.log(`   ❌ Не удалось спарсить: ${failedIds.length} ID`);
  console.log(`   ⏳ В очереди на парсинг: ${toParse.length} ID\n`);

  if (toParse.length === 0) {
    console.log('✅ Очередь на парсинг пуста!');
    console.log(`\n💡 Добавьте ID или ссылки в файл: ${TO_PARSE_FILE}`);
    return;
  }

  // 3. Обрабатываем ID из очереди (с поддержкой диапазонов)
  const parsedIdsSet = new Set(parsedIds);
  const failedIdsSet = new Set(failedIds.map(f => f.id));

  const idsToProcess: number[] = [];
  const skippedIds: { id: number; reason: string }[] = [];

  for (const item of toParse) {
    // Расширяем диапазоны (например, "100-105" → [100, 101, 102, 103, 104, 105])
    const expandedIds = expandRange(item);

    if (expandedIds.length === 0) {
      console.warn(`⚠️ Не удалось извлечь ID из: ${item}`);
      continue;
    }

    // Обрабатываем каждый ID из расширенного диапазона
    for (const cocktailId of expandedIds) {
      if (parsedIdsSet.has(cocktailId)) {
        skippedIds.push({ id: cocktailId, reason: 'уже спарсено' });
        continue;
      }

      if (failedIdsSet.has(cocktailId)) {
        skippedIds.push({ id: cocktailId, reason: 'в чёрном списке' });
        continue;
      }

      idsToProcess.push(cocktailId);
    }
  }

  if (skippedIds.length > 0) {
    console.log(`⏭️  Пропущено ${skippedIds.length} ID:`);
    skippedIds.forEach(({ id, reason }) => {
      console.log(`   - ID ${id} (${reason})`);
    });
    console.log('');
  }

  if (idsToProcess.length === 0) {
    console.log('✅ Нет новых ID для парсинга!');
    // Очищаем очередь от обработанных
    fs.writeFileSync(TO_PARSE_FILE, JSON.stringify([], null, 2), 'utf-8');
    return;
  }

  console.log(`🍸 Начинаем парсинг ${idsToProcess.length} новых коктейлей:\n`);

  const newRecipes: InshakerRecipe[] = [];
  const newParsedIds: number[] = [];
  const newFailedIds: FailedParseAttempt[] = [];

  // 4. Парсим каждый ID
  for (let i = 0; i < idsToProcess.length; i++) {
    const cocktailId = idsToProcess[i];
    const result = await parseRecipe(cocktailId);

    if (result.success && result.recipe) {
      newRecipes.push(result.recipe);
      newParsedIds.push(cocktailId);
      console.log(`✅ Успешно: ${result.recipe.name} (${result.recipe.ingredients.length} ингредиентов)`);
    } else {
      newFailedIds.push({
        id: cocktailId,
        error: result.error || 'Неизвестная ошибка',
        errorCode: result.errorCode,
        attemptedAt: new Date().toISOString(),
      });
      console.log(`❌ Не удалось спарсить ID ${cocktailId}: ${result.error}`);
    }

    // Задержка между запросами
    if (i < idsToProcess.length - 1) {
      await delay(DELAY_MS);
    }
  }

  // 5. Обновляем базу рецептов
  if (newRecipes.length > 0) {
    const allRecipes = [...existingRecipes, ...newRecipes];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecipes, null, 2), 'utf-8');
  }

  // 6. Обновляем таблицы
  const updatedParsedIds = [...parsedIds, ...newParsedIds];
  const updatedFailedIds = [...failedIds, ...newFailedIds];

  fs.writeFileSync(PARSED_IDS_FILE, JSON.stringify(updatedParsedIds, null, 2), 'utf-8');
  fs.writeFileSync(FAILED_IDS_FILE, JSON.stringify(updatedFailedIds, null, 2), 'utf-8');
  fs.writeFileSync(TO_PARSE_FILE, JSON.stringify([], null, 2), 'utf-8'); // Очищаем очередь

  // 7. Итоговая статистика
  console.log(`\n✨ Парсинг завершён!`);
  console.log(`\n📊 Результаты:`);
  console.log(`   ✅ Успешно спарсено: ${newParsedIds.length} рецептов`);
  console.log(`   ❌ Ошибки парсинга: ${newFailedIds.length} ID`);
  console.log(`   ⏭️  Пропущено: ${skippedIds.length} ID`);

  if (newRecipes.length > 0) {
    console.log(`\n📁 База рецептов обновлена: ${OUTPUT_FILE}`);
    const totalRecipes = existingRecipes.length + newRecipes.length;
    console.log(`   - Всего рецептов: ${totalRecipes}`);
    console.log(`   - Алкогольных: ${existingRecipes.filter(r => r.alcoholic).length + newRecipes.filter(r => r.alcoholic).length}`);
    console.log(`   - Безалкогольных: ${existingRecipes.filter(r => !r.alcoholic).length + newRecipes.filter(r => !r.alcoholic).length}`);
  }

  console.log(`\n📋 Таблицы обновлены:`);
  console.log(`   - ${PARSED_IDS_FILE} (${updatedParsedIds.length} ID)`);
  console.log(`   - ${FAILED_IDS_FILE} (${updatedFailedIds.length} ID)`);
  console.log(`   - ${TO_PARSE_FILE} (очищена)`);
}

// Запуск
main().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});
