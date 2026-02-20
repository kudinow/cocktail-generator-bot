import fs from "fs";
import path from "path";
import { slugify } from "./slugify";

export interface Ingredient {
  amount: string;
  name: string;
}

export interface Recipe {
  id: number;
  name: string;
  image: string;
  category: string;
  tags: string[];
  glass: string;
  ingredients: Ingredient[];
  instructions: string[];
  alcoholic: boolean;
  source: string;
  parsedAt: string;
  slug: string;
}

export interface IngredientInfo {
  name: string;
  slug: string;
  count: number;
}

let _recipes: Recipe[] | null = null;

function buildSlugs(
  rawRecipes: Omit<Recipe, "slug">[]
): Map<number, string> {
  const idToSlug = new Map<number, string>();
  const slugCount = new Map<string, number>();

  for (const recipe of rawRecipes) {
    const base = slugify(recipe.name);
    const n = slugCount.get(base) ?? 0;
    const slug = n === 0 ? base : `${base}-${recipe.id}`;
    slugCount.set(base, n + 1);
    idToSlug.set(recipe.id, slug);
  }

  return idToSlug;
}

function loadRecipes(): Recipe[] {
  if (_recipes) return _recipes;

  const filePath = path.join(
    process.cwd(),
    "..",
    "data",
    "inshaker_recipes.json"
  );
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as Omit<Recipe, "slug">[];

  const idToSlug = buildSlugs(data);
  _recipes = data.map((r) => ({ ...r, slug: idToSlug.get(r.id)! }));
  return _recipes;
}

export function getRecipes(): Recipe[] {
  return loadRecipes();
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return loadRecipes().find((r) => r.slug === slug);
}

export function getImagePath(recipe: Pick<Recipe, "id">): string {
  return `/cocktail-images/${recipe.id}.jpg`;
}

export function getIngredients(): IngredientInfo[] {
  const freq = new Map<string, number>();
  for (const r of loadRecipes()) {
    for (const ing of r.ingredients) {
      if (ing.name) freq.set(ing.name, (freq.get(ing.name) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count);
}

export function getIngredientBySlug(slug: string): IngredientInfo | undefined {
  return getIngredients().find((i) => i.slug === slug);
}

export function getRecipesByIngredient(ingredientSlug: string): Recipe[] {
  return loadRecipes().filter((r) =>
    r.ingredients.some((i) => slugify(i.name) === ingredientSlug)
  );
}

export function getSimilarRecipes(recipeId: number, count = 4): Recipe[] {
  const recipes = loadRecipes();
  const target = recipes.find((r) => r.id === recipeId);
  if (!target) return [];

  const targetSet = new Set(target.ingredients.map((i) => i.name));

  return recipes
    .filter((r) => r.id !== recipeId)
    .map((r) => ({
      recipe: r,
      shared: r.ingredients.filter((i) => targetSet.has(i.name)).length,
    }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, count)
    .map((x) => x.recipe);
}
