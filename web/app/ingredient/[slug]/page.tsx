import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getIngredients,
  getIngredientBySlug,
  getRecipesByIngredient,
} from "@/lib/recipes";
import CocktailCard from "@/components/CocktailCard";
import CTABlock from "@/components/CTABlock";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getIngredients().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ingredient = getIngredientBySlug(slug);
  if (!ingredient) return {};

  return {
    title: `Коктейли с ${ingredient.name}`,
    description: `${ingredient.count} рецептов коктейлей с ${ingredient.name}. Получи рецепт по своим ингредиентам в Telegram-боте.`,
  };
}

export default async function IngredientPage({ params }: Props) {
  const { slug } = await params;
  const ingredient = getIngredientBySlug(slug);
  if (!ingredient) notFound();

  const recipes = getRecipesByIngredient(slug);

  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-14 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center bg-lime-light border border-lime-mid text-forest text-[12px] font-semibold px-3 py-1.5 rounded-full mb-4">
          Ингредиент
        </div>
        <h1 className="text-[clamp(28px,4vw,46px)] font-extrabold tracking-[-1.5px] text-ink mb-2">
          Коктейли с {ingredient.name}
        </h1>
        <p className="text-muted text-[15px]">
          {recipes.length} рецептов · Полный рецепт — в Telegram-боте
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-16">
        {recipes.map((recipe) => (
          <CocktailCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      <CTABlock
        title={`🍸 Есть ${ingredient.name}? Подбери коктейль`}
        subtitle="Добавь все ингредиенты что есть дома — бот покажет все подходящие рецепты сразу"
        buttonText="Открыть бота →"
      />
    </div>
  );
}
