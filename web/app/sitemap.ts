import { MetadataRoute } from "next";
import { getRecipes, getIngredients } from "@/lib/recipes";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const recipes = getRecipes();
  const ingredients = getIngredients();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/cocktails/`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const recipePages: MetadataRoute.Sitemap = recipes.map((r) => ({
    url: `${SITE_URL}/cocktails/${r.slug}/`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const ingredientPages: MetadataRoute.Sitemap = ingredients.map((i) => ({
    url: `${SITE_URL}/ingredient/${i.slug}/`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...recipePages, ...ingredientPages];
}
