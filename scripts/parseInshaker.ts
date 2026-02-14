import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { InshakerRecipe, InshakerIngredient } from '../src/types';

const BASE_URL = 'https://ru.inshaker.com';
const OUTPUT_FILE = path.join(__dirname, '../data/inshaker_recipes.json');
const DELAY_MS = 1000; // Задержка между запросами (1 сек)

// Список популярных коктейлей (ID из URL)
const POPULAR_COCKTAILS = [
  // Первые 25 (уже спарсенные)
  39,   // Маргарита
  55,   // Негрони
  1098, // Aperol Spritz
  48,   // Ржавый гвоздь
  43,   // Ураган
  123,  // Ром коллинз
  40,   // Мартинез
  52,   // Отвертка
  38,   // Манхэттен
  47,   // Сазерак
  44,   // Том коллинз
  1,    // Восхитительный
  56,   // Мятный джулеп
  41,   // Мимоза
  46,   // Сингапурский слинг
  42,   // Френч 75
  49,   // Рамос джин физ
  50,   // Пунш плантатора
  51,   // Писко пунш
  53,   // Олд фешен
  54,   // Никербокер
  57,   // Мохито
  58,   // Московский мул
  59,   // Сайдкар
  60,   // Писко сауэр

  // Добавляем ещё 75 популярных коктейлей
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
  91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
  111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
  121, 122, 124, 125, 126, 127, 128, 129, 130,
  131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
  141, 142, 143, 144, 145,

  // добавляю порнстар мартини
  724
];

// Утилита для задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Парсинг одного рецепта
async function parseRecipe(cocktailId: number): Promise<InshakerRecipe | null> {
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

    if (jsonLdScript) {
      return parseFromJsonLd(cocktailId, jsonLdScript, $);
    } else {
      // Fallback: парсинг из HTML
      return parseFromHtml(cocktailId, $);
    }

  } catch (error: any) {
    console.error(`Ошибка парсинга коктейля ${cocktailId}:`, error.message);
    return null;
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
  // Загружаем существующие рецепты (если есть)
  let existingRecipes: InshakerRecipe[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const fileContent = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      existingRecipes = JSON.parse(fileContent);
      console.log(`📚 Загружено ${existingRecipes.length} существующих рецептов`);
    } catch (error) {
      console.warn('⚠️ Не удалось загрузить существующие рецепты, создаём новый файл');
    }
  }

  // Находим ID, которые уже есть в базе
  const existingIds = new Set(existingRecipes.map(r => r.id));
  const newIds = POPULAR_COCKTAILS.filter(id => !existingIds.has(id));

  if (newIds.length === 0) {
    console.log('✅ Все коктейли уже в базе! Новых рецептов для парсинга нет.');
    return;
  }

  console.log(`🍸 Найдено ${newIds.length} новых коктейлей для парсинга:\n`);
  console.log(`   IDs: ${newIds.join(', ')}\n`);

  const newRecipes: InshakerRecipe[] = [];

  for (let i = 0; i < newIds.length; i++) {
    const cocktailId = newIds[i];
    const recipe = await parseRecipe(cocktailId);

    if (recipe) {
      newRecipes.push(recipe);
      console.log(`✅ Успешно: ${recipe.name} (${recipe.ingredients.length} ингредиентов)`);
    } else {
      console.log(`❌ Не удалось спарсить ID ${cocktailId}`);
    }

    // Задержка между запросами
    if (i < newIds.length - 1) {
      await delay(DELAY_MS);
    }
  }

  // Объединяем существующие и новые рецепты
  const allRecipes = [...existingRecipes, ...newRecipes];

  // Сохранение в JSON
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecipes, null, 2), 'utf-8');

  console.log(`\n✨ Готово! Добавлено ${newRecipes.length} новых рецептов.`);
  console.log(`📁 Сохранено в: ${OUTPUT_FILE}`);
  console.log(`\nОбщая статистика:`);
  console.log(`  - Всего рецептов: ${allRecipes.length}`);
  console.log(`  - Алкогольных: ${allRecipes.filter(r => r.alcoholic).length}`);
  console.log(`  - Безалкогольных: ${allRecipes.filter(r => !r.alcoholic).length}`);
  const avgRating = allRecipes.reduce((sum, r) => sum + (r.rating || 0), 0) / allRecipes.length;
  console.log(`  - Средний рейтинг: ${avgRating.toFixed(2)}`);
}

// Запуск
main().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});
