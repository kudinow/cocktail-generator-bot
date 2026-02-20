import Link from "next/link";
import Image from "next/image";
import { Recipe, getImagePath } from "@/lib/recipes";

interface Props {
  recipe: Recipe;
}

export default function CocktailCard({ recipe }: Props) {
  return (
    <Link
      href={`/cocktails/${recipe.slug}/`}
      className="group block bg-white rounded-[20px] overflow-hidden border border-lime/15 hover:border-lime/40 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(11,48,24,0.1)] transition-all duration-300 no-underline"
    >
      <div className="relative aspect-[4/3] bg-surface overflow-hidden">
        <Image
          src={getImagePath(recipe)}
          alt={`Коктейль ${recipe.name}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-400"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>
      <div className="p-3.5">
        <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2 tracking-tight">
          {recipe.name}
        </h3>
        <p className="text-xs text-soft mt-1 font-medium">
          {recipe.ingredients.length} ингредиентов
        </p>
      </div>
    </Link>
  );
}
