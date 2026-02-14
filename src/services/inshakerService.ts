import * as fs from 'fs';
import * as path from 'path';
import { InshakerRecipe } from '../types';

/** Расширенный интерфейс с информацией о совпадениях */
export interface InshakerRecipeWithMatch extends InshakerRecipe {
  matchCount: number;
  matchPercentage: number;
  totalIngredients: number;
  missingIngredients: string[];
}

class InshakerService {
  private recipes: InshakerRecipe[] = [];
  private recipesPath: string;

  constructor(recipesPath: string = './data/inshaker_recipes.json') {
    this.recipesPath = recipesPath;
    this.loadRecipes();
  }

  /** Загружает рецепты из JSON файла */
  private loadRecipes(): void {
    try {
      const absolutePath = path.resolve(this.recipesPath);
      const data = fs.readFileSync(absolutePath, 'utf-8');
      this.recipes = JSON.parse(data);
      console.log(`✅ Загружено ${this.recipes.length} рецептов из Inshaker`);
    } catch (error) {
      console.error('Ошибка загрузки рецептов Inshaker:', error);
      this.recipes = [];
    }
  }

  /** Получить все рецепты */
  getAllRecipes(): InshakerRecipe[] {
    return this.recipes;
  }

  /** Получить рецепт по ID */
  getRecipeById(id: number): InshakerRecipe | null {
    return this.recipes.find(r => r.id === id) || null;
  }

  /** Поиск рецепта по названию (нечувствительный к регистру) */
  searchByName(name: string): InshakerRecipe[] {
    const searchTerm = name.toLowerCase().trim();

    return this.recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(searchTerm)
    );
  }

  /** Поиск коктейлей по ингредиентам с расчётом совпадений */
  findByIngredients(userIngredients: string[]): InshakerRecipeWithMatch[] {
    if (userIngredients.length === 0) {
      return [];
    }

    // Нормализуем ингредиенты пользователя (к нижнему регистру)
    const userIngredientsLower = userIngredients.map(ing =>
      ing.toLowerCase().trim()
    );

    const recipesWithMatch: InshakerRecipeWithMatch[] = [];

    for (const recipe of this.recipes) {
      // Извлекаем названия ингредиентов из рецепта
      const recipeIngredients = recipe.ingredients.map(ing =>
        ing.name.toLowerCase().trim()
      );

      // Подсчитываем совпадения
      let matchCount = 0;
      const missingIngredients: string[] = [];

      for (const recipeIng of recipe.ingredients) {
        const recipeIngLower = recipeIng.name.toLowerCase().trim();

        // Проверяем точное совпадение или частичное (например, "джин" в "лондонский сухой джин")
        const hasMatch = userIngredientsLower.some(userIng =>
          recipeIngLower.includes(userIng) || userIng.includes(recipeIngLower)
        );

        if (hasMatch) {
          matchCount++;
        } else {
          missingIngredients.push(recipeIng.name);
        }
      }

      // Определяем минимальное количество совпадений:
      // - Если выбран 1 ингредиент → показываем все коктейли с ним (минимум 1)
      // - Если выбрано 2+ ингредиента → показываем только где минимум 2 совпадают
      const minMatches = userIngredients.length >= 2 ? 2 : 1;

      if (matchCount >= minMatches) {
        const totalIngredients = recipe.ingredients.length;
        const matchPercentage = totalIngredients > 0
          ? Math.round((matchCount / totalIngredients) * 100)
          : 0;

        recipesWithMatch.push({
          ...recipe,
          matchCount,
          matchPercentage,
          totalIngredients,
          missingIngredients,
        });
      }
    }

    // Сортируем: сначала по проценту совпадения, затем по количеству совпадений
    return recipesWithMatch.sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }
      return b.matchCount - a.matchCount;
    });
  }

  /** Получить случайный рецепт */
  getRandomRecipe(): InshakerRecipe | null {
    if (this.recipes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.recipes.length);
    return this.recipes[randomIndex];
  }

  /** Получить статистику базы данных */
  getStats() {
    return {
      total: this.recipes.length,
      alcoholic: this.recipes.filter(r => r.alcoholic).length,
      nonAlcoholic: this.recipes.filter(r => !r.alcoholic).length,
      avgIngredients: this.recipes.length > 0
        ? Math.round(
            this.recipes.reduce((sum, r) => sum + r.ingredients.length, 0) /
            this.recipes.length
          )
        : 0,
    };
  }
}

export default InshakerService;
