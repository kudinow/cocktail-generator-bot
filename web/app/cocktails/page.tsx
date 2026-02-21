import { Metadata } from "next";
import { getRecipes } from "@/lib/recipes";
import CocktailCard from "@/components/CocktailCard";

export const metadata: Metadata = {
  title: "Все рецепты коктейлей",
  description:
    "Каталог из 1144 рецептов коктейлей. Найди рецепт по ингредиентам в Telegram-боте.",
};

export default function CocktailsPage() {
  const recipes = getRecipes();

  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-14 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="text-xs font-bold tracking-[2px] uppercase text-lime mb-2">База рецептов</div>
        <h1 className="text-[clamp(28px,4vw,46px)] font-extrabold tracking-[-1.5px] text-ink mb-2">
          Рецепты коктейлей
        </h1>
        <p className="text-muted text-[15px]">
          {recipes.length} рецептов · Пошаговые инструкции в Telegram-боте
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {recipes.map((recipe) => (
          <CocktailCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
