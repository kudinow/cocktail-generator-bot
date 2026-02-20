import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRecipes,
  getRecipeBySlug,
  getImagePath,
  getSimilarRecipes,
} from "@/lib/recipes";
import CTABlock from "@/components/CTABlock";
import CocktailCard from "@/components/CocktailCard";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getRecipes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return {};

  const ingList = recipe.ingredients
    .slice(0, 4)
    .map((i) => i.name)
    .join(", ");

  return {
    title: `Коктейль ${recipe.name} — рецепт`,
    description: `Рецепт коктейля ${recipe.name}: ${ingList}. Узнай пропорции и способ приготовления в Telegram-боте.`,
  };
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);
  if (!recipe) notFound();

  const similar = getSimilarRecipes(recipe.id, 4);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-14 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-soft mb-6 flex items-center gap-2">
        <Link href="/cocktails/" className="hover:text-muted transition-colors no-underline">
          Все рецепты
        </Link>
        <span className="text-soft/50">›</span>
        <span className="text-muted">{recipe.name}</span>
      </nav>

      {/* Category tag */}
      {recipe.category && (
        <div className="inline-flex items-center bg-lime-light border border-lime-mid text-forest text-[12px] font-semibold px-3 py-1.5 rounded-full mb-4">
          {recipe.category}
        </div>
      )}

      {/* Title */}
      <h1 className="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.5px] text-ink mb-8 leading-[1.1]">
        Коктейль {recipe.name}
      </h1>

      {/* Photo */}
      <div className="relative aspect-video rounded-3xl overflow-hidden bg-surface mb-10 shadow-[0_20px_60px_rgba(11,48,24,0.1)]">
        <Image
          src={getImagePath(recipe)}
          alt={`Коктейль ${recipe.name}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>

      {/* Ingredients */}
      <div className="mb-10">
        <h2 className="text-[20px] font-bold text-ink mb-5 tracking-tight">
          Что понадобится
        </h2>
        <ul className="space-y-2.5">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-center gap-3 text-muted text-[15px]">
              <span className="w-2 h-2 rounded-full bg-lime flex-shrink-0 shadow-[0_0_0_3px_rgba(44,200,74,0.2)]" />
              <span className="font-medium text-ink">{ing.name}</span>
              {ing.amount && (
                <span className="ml-auto text-soft text-sm font-medium">{ing.amount}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <CTABlock
        title="🍹 Пошаговый рецепт — в Telegram-боте"
        subtitle={`Точные пропорции и инструкция по приготовлению ${recipe.name} — бесплатно`}
        buttonText="Получить рецепт →"
      />

      {/* Similar */}
      {similar.length > 0 && (
        <div className="mt-16">
          <h2 className="text-[20px] font-bold text-ink mb-6 tracking-tight">
            Похожие коктейли
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {similar.map((r) => (
              <CocktailCard key={r.id} recipe={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
