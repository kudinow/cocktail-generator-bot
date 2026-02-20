import { BOT_URL } from "@/lib/config";

interface Props {
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

export default function CTABlock({
  title = "🍹 Пошаговый рецепт — в Telegram-боте",
  subtitle = "Узнай точные пропорции и способ приготовления бесплатно",
  buttonText = "Получить рецепт →",
}: Props) {
  return (
    <div className="bg-forest rounded-2xl p-8 sm:p-10 text-center">
      <p className="text-white font-bold text-lg sm:text-xl tracking-tight">{title}</p>
      <p className="text-white/60 text-sm sm:text-base mt-2">{subtitle}</p>
      <a
        href={BOT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-6 bg-lime text-forest font-bold px-10 py-4 rounded-full hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(44,200,74,0.45)] transition-all duration-200 text-sm sm:text-base no-underline"
      >
        {buttonText}
      </a>
    </div>
  );
}
