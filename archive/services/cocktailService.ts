import axios from 'axios';
import { Cocktail, CocktailSearchResult, CocktailWithMatch, ApiResponse, IngredientList } from '../types';
import { config } from '../config/config';

class CocktailService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.cocktailApiUrl;
  }

  async searchByIngredient(ingredient: string): Promise<CocktailSearchResult[]> {
    try {
      const response = await axios.get<ApiResponse<CocktailSearchResult>>(
        `${this.baseUrl}/filter.php?i=${encodeURIComponent(ingredient)}`
      );
      return response.data.drinks || [];
    } catch (error) {
      console.error(`Ошибка поиска по ингредиенту ${ingredient}:`, error);
      return [];
    }
  }

  async searchByName(name: string): Promise<Cocktail[]> {
    try {
      const response = await axios.get<ApiResponse<Cocktail>>(
        `${this.baseUrl}/search.php?s=${encodeURIComponent(name)}`
      );
      return response.data.drinks || [];
    } catch (error) {
      console.error(`Ошибка поиска по названию "${name}":`, error);
      return [];
    }
  }

  async getCocktailById(id: string): Promise<Cocktail | null> {
    try {
      const response = await axios.get<ApiResponse<Cocktail>>(
        `${this.baseUrl}/lookup.php?i=${id}`
      );
      return response.data.drinks?.[0] || null;
    } catch (error) {
      console.error(`Ошибка получения коктейля ${id}:`, error);
      return null;
    }
  }

  async getAllIngredients(): Promise<string[]> {
    try {
      const response = await axios.get<ApiResponse<IngredientList>>(
        `${this.baseUrl}/list.php?i=list`
      );
      return response.data.drinks?.map(d => d.strIngredient1) || [];
    } catch (error) {
      console.error('Ошибка получения списка ингредиентов:', error);
      return [];
    }
  }

  async findCocktailsByIngredients(ingredients: string[]): Promise<CocktailWithMatch[]> {
    if (ingredients.length === 0) {
      return [];
    }

    try {
      const cocktailsMap = new Map<string, CocktailSearchResult>();
      const cocktailMatchCount = new Map<string, number>();

      for (const ingredient of ingredients) {
        const results = await this.searchByIngredient(ingredient);
        results.forEach(cocktail => {
          cocktailsMap.set(cocktail.idDrink, cocktail);
          cocktailMatchCount.set(
            cocktail.idDrink,
            (cocktailMatchCount.get(cocktail.idDrink) || 0) + 1
          );
        });
      }

      const cocktailsWithDetails: CocktailWithMatch[] = [];

      for (const [id, searchResult] of cocktailsMap.entries()) {
        const fullCocktail = await this.getCocktailById(id);
        if (fullCocktail) {
          const cocktailIngredients = this.extractIngredients(fullCocktail);
          const matchCount = cocktailMatchCount.get(id) || 0;
          const totalIngredients = cocktailIngredients.length;
          const matchPercentage = totalIngredients > 0 
            ? Math.round((matchCount / totalIngredients) * 100) 
            : 0;

          const userIngredientsLower = ingredients.map(i => i.toLowerCase());
          const missingIngredients = cocktailIngredients.filter(
            ing => !userIngredientsLower.includes(ing.toLowerCase())
          );

          cocktailsWithDetails.push({
            ...fullCocktail,
            matchCount,
            matchPercentage,
            totalIngredients,
            missingIngredients,
          });
        }
      }

      return cocktailsWithDetails.sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return b.matchCount - a.matchCount;
      });
    } catch (error) {
      console.error('Ошибка поиска коктейлей:', error);
      return [];
    }
  }

  extractIngredients(cocktail: Cocktail): string[] {
    const ingredients: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const ingredient = cocktail[`strIngredient${i}` as keyof Cocktail];
      if (ingredient && typeof ingredient === 'string' && ingredient.trim()) {
        ingredients.push(ingredient.trim());
      }
    }
    return ingredients;
  }

  extractMeasures(cocktail: Cocktail): string[] {
    const measures: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const measure = cocktail[`strMeasure${i}` as keyof Cocktail];
      if (measure && typeof measure === 'string' && measure.trim()) {
        measures.push(measure.trim());
      } else {
        measures.push('');
      }
    }
    return measures;
  }
}

export default CocktailService;
