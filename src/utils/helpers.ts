import { InshakerRecipe } from '../types';
import { InshakerRecipeWithMatch } from '../services/inshakerService';

// АРХИВИРОВАНО: функции для форматирования TheCocktailDB рецептов
// Сохранены для возможного возврата к API
// См. archive/README.md для деталей

// import { CocktailWithMatch } from '../types';
// import CocktailService from '../services/cocktailService';
// import TranslationService from '../services/translationService';
//
// const cocktailService = new CocktailService();
//
// export const formatCocktailRecipe = async (
//   cocktail: CocktailWithMatch,
//   translationService: TranslationService
// ): Promise<string> => {
//   const ingredients = cocktailService.extractIngredients(cocktail).map((i: any) => translateToRussian(i));
//   const measures = cocktailService.extractMeasures(cocktail);
//
//   // Переводим текстовые поля
//   const translatedName = await translationService.translateToRussian(cocktail.strDrink);
//   const translatedCategory = cocktail.strCategory
//     ? await translationService.translateToRussian(cocktail.strCategory)
//     : '';
//   const translatedAlcoholic = cocktail.strAlcoholic
//     ? await translationService.translateToRussian(cocktail.strAlcoholic)
//     : '';
//   const translatedGlass = cocktail.strGlass
//     ? await translationService.translateToRussian(cocktail.strGlass)
//     : '';
//   const translatedInstructions = cocktail.strInstructions
//     ? await translationService.translateToRussian(cocktail.strInstructions)
//     : '';
//
//   let recipe = `🍸 *${translatedName}*\n\n`;
//
//   recipe += `📊 *Совпадение:* ${cocktail.matchCount}/${cocktail.totalIngredients} ингредиентов (${cocktail.matchPercentage}%)\n\n`;
//
//   if (translatedCategory) {
//     recipe += `📁 *Категория:* ${translatedCategory}\n`;
//   }
//   if (translatedAlcoholic) {
//     recipe += `🥃 *Тип:* ${translatedAlcoholic}\n`;
//   }
//   if (translatedGlass) {
//     recipe += `🥂 *Бокал:* ${translatedGlass}\n`;
//   }
//
//   recipe += `\n*Ингредиенты:*\n`;
//   ingredients.forEach((ingredient: any, index: any) => {
//     const measure = measures[index] || '';
//     const hasIngredient = cocktail.missingIngredients.findIndex(
//       mi => mi.toLowerCase() === ingredient.toLowerCase()
//     ) === -1;
//     const emoji = hasIngredient ? '✅' : '❌';
//     recipe += `${emoji} ${measure} ${ingredient}\n`;
//   });
//
//   if (cocktail.missingIngredients.length > 0) {
//     recipe += `\n*Не хватает:* ${cocktail.missingIngredients.map((i: any) => translateToRussian(i)).join(', ')}\n`;
//   }
//
//   if (translatedInstructions) {
//     recipe += `\n*Приготовление:*\n${translatedInstructions}\n`;
//   }
//
//   return recipe;
// };
//
// export const formatCocktailsList = (cocktails: CocktailWithMatch[]): string => {
//   if (cocktails.length === 0) {
//     return '😔 К сожалению, не найдено коктейлей с указанными ингредиентами.';
//   }
//
//   let message = `🔍 Найдено коктейлей: ${cocktails.length}\n\n`;
//
//   cocktails.slice(0, 10).forEach((cocktail, index) => {
//     message += `${index + 1}. *${cocktail.strDrink}*\n`;
//     message += `   Совпадение: ${cocktail.matchCount}/${cocktail.totalIngredients} (${cocktail.matchPercentage}%)\n`;
//     if (cocktail.missingIngredients.length > 0) {
//       const missing = cocktail.missingIngredients.slice(0, 3).map((i: any) => translateToRussian(i));
//       message += `   Не хватает: ${missing.join(', ')}${cocktail.missingIngredients.length > 3 ? '...' : ''}\n`;
//     }
//     message += `\n`;
//   });
//
//   message += `\nИспользуйте кнопки ниже, чтобы посмотреть рецепты 👇`;
//
//   return message;
// };

// Словарь русский → английский для ингредиентов
const ingredientMap: Record<string, string> = {
  'Водка': 'Vodka',
  'Ром': 'Rum',
  'Джин': 'Gin',
  'Текила': 'Tequila',
  'Виски': 'Whiskey',
  'Лайм': 'Lime',
  'Лимон': 'Lemon',
  'Сахар': 'Sugar',
  'Мята': 'Mint',
  'Апельсиновый сок': 'Orange juice',
  'Клюквенный сок': 'Cranberry juice',
  'Содовая': 'Soda water',
  'Тоник': 'Tonic water',
  'Кола': 'Cola',
  'Трипл сек': 'Triple sec',
  'Вермут': 'Vermouth',
  'Биттер': 'Bitters',
  'Гренадин': 'Grenadine',
  'Кокосовое молоко': 'Coconut milk',
  'Ананасовый сок': 'Pineapple juice',
  'Сливки': 'Cream',
  'Кофейный ликёр': 'Kahlua',
  'Абсент': 'Absinthe',
  'Бренди': 'Brandy',
  'Шампанское': 'Champagne',
  'Ликёр': 'Liqueur',
  'Мёд': 'Honey',
  'Имбирное пиво': 'Ginger beer',
  'Сахарный сироп': 'Sugar syrup',
};

// Обратный словарь: английский → русский
const reverseIngredientMap: Record<string, string> = Object.fromEntries(
  Object.entries(ingredientMap).map(([ru, en]) => [en.toLowerCase(), ru])
);

export const translateToEnglish = (ingredient: string): string => {
  return ingredientMap[ingredient] || ingredient;
};

export const translateToRussian = (ingredient: string): string => {
  return reverseIngredientMap[ingredient.toLowerCase()] || ingredient;
};

export const getPopularIngredients = (): { ru: string; en: string }[] => {
  return [
    'Водка', 'Ром', 'Джин', 'Текила', 'Виски',
    'Лайм', 'Лимон', 'Сахар', 'Мята', 'Апельсиновый сок',
    'Клюквенный сок', 'Содовая', 'Тоник', 'Кола',
    'Трипл сек', 'Вермут', 'Биттер', 'Гренадин'
  ].map(ru => ({ ru, en: ingredientMap[ru] }));
};

export const escapeMarkdown = (text: string): string => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

// ============================================================
// Функции для форматирования рецептов Inshaker
// ============================================================

/** Форматирует рецепт коктейля из Inshaker для отображения пользователю */
export const formatInshakerRecipe = (recipe: InshakerRecipe): string => {
  let text = `🍸 *${recipe.name}*\n\n`;

  if (recipe.category) {
    text += `📁 *Категория:* ${recipe.category}\n`;
  }

  if (recipe.glass) {
    text += `🥂 *Бокал:* ${recipe.glass}\n`;
  }

  if (recipe.tags.length > 0) {
    text += `🏷 *Теги:* ${recipe.tags.join(', ')}\n`;
  }

  text += `\n*Ингредиенты:*\n`;
  recipe.ingredients.forEach(ing => {
    const amount = ing.amount ? `${ing.amount} ` : '';
    text += `• ${amount}${ing.name}\n`;
  });

  if (recipe.instructions.length > 0) {
    text += `\n*Приготовление:*\n`;
    recipe.instructions.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });
  }

  return text;
};

/** Форматирует рецепт с информацией о совпадении ингредиентов */
export const formatInshakerRecipeWithMatch = (
  recipe: InshakerRecipeWithMatch
): string => {
  let text = `🍸 *${recipe.name}*\n\n`;

  text += `📊 *Совпадение:* ${recipe.matchCount}/${recipe.totalIngredients} ингредиентов (${recipe.matchPercentage}%)\n\n`;

  if (recipe.category) {
    text += `📁 *Категория:* ${recipe.category}\n`;
  }

  if (recipe.glass) {
    text += `🥂 *Бокал:* ${recipe.glass}\n`;
  }

  text += `\n*Ингредиенты:*\n`;
  recipe.ingredients.forEach(ing => {
    const amount = ing.amount ? `${ing.amount} ` : '';
    const hasIngredient = !recipe.missingIngredients.some(
      missing => missing.toLowerCase() === ing.name.toLowerCase()
    );
    const emoji = hasIngredient ? '✅' : '❌';
    text += `${emoji} ${amount}${ing.name}\n`;
  });

  if (recipe.missingIngredients.length > 0) {
    text += `\n*Не хватает:* ${recipe.missingIngredients.join(', ')}\n`;
  }

  if (recipe.instructions.length > 0) {
    text += `\n*Приготовление:*\n`;
    recipe.instructions.forEach((step, index) => {
      text += `${index + 1}. ${step}\n`;
    });
  }

  return text;
};

/** Форматирует список найденных коктейлей с совпадениями */
export const formatInshakerCocktailsList = (
  cocktails: InshakerRecipeWithMatch[]
): string => {
  if (cocktails.length === 0) {
    return '😔 К сожалению, не найдено коктейлей с указанными ингредиентами.';
  }

  let message = `🔍 Найдено коктейлей: ${cocktails.length}\n\n`;

  cocktails.slice(0, 10).forEach((cocktail, index) => {
    message += `${index + 1}. *${cocktail.name}*\n`;
    message += `   Совпадение: ${cocktail.matchCount}/${cocktail.totalIngredients} (${cocktail.matchPercentage}%)\n`;

    if (cocktail.missingIngredients.length > 0) {
      const missing = cocktail.missingIngredients.slice(0, 3);
      message += `   Не хватает: ${missing.join(', ')}${
        cocktail.missingIngredients.length > 3 ? '...' : ''
      }\n`;
    }
    message += `\n`;
  });

  message += `\nИспользуйте кнопки ниже, чтобы посмотреть рецепты 👇`;

  return message;
};
