import Link from "next/link";
import Image from "next/image";
import { getRecipes, getImagePath, getRecipeBySlug } from "@/lib/recipes";
import { BOT_URL } from "@/lib/config";

export default function HomePage() {
  const recipes = getRecipes();
  const preview = recipes.slice(0, 8);
  const heroRecipe = getRecipeBySlug("mokhito") ?? recipes[0];

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-68px)] max-h-[860px]">

        {/* Left */}
        <div className="relative flex flex-col justify-center px-5 sm:px-14 py-16 lg:py-20 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-24 -left-44 w-[420px] h-[420px] rounded-full bg-lime-light opacity-60 pointer-events-none" />
          <div className="absolute -bottom-14 -right-10 w-[200px] h-[200px] rounded-full bg-lime-light opacity-40 pointer-events-none" />

          <div className="relative z-10 max-w-lg">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-lime-light border border-lime-mid text-forest text-[13px] font-semibold px-4 py-[7px] rounded-full mb-8">
              <span className="w-[7px] h-[7px] rounded-full bg-lime shadow-[0_0_0_3px_rgba(44,200,74,0.25)]" />
              429 рецептов · бесплатно
            </div>

            <h1 className="text-[clamp(36px,4.2vw,62px)] font-extrabold leading-[1.08] tracking-[-2px] text-ink mb-5">
              Миксуй коктейли из того, что есть{" "}
              <span className="text-lime">дома</span>
            </h1>
            <p className="text-[18px] font-light text-muted leading-[1.75] mb-10 max-w-[440px]">
              Укажи ингредиенты из своего бара — бот мгновенно подберёт рецепты.{" "}
              <strong className="font-semibold text-forest">Пошагово. В Telegram. Бесплатно.</strong>
            </p>

            <div className="flex gap-3 flex-wrap mb-12">
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-forest text-white text-[15px] font-bold px-9 py-4 rounded-full hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(11,48,24,0.3)] transition-all duration-200 no-underline shadow-[0_4px_20px_rgba(11,48,24,0.25)]"
              >
                Открыть бота →
              </a>
              <Link
                href="/cocktails/"
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-muted px-6 py-4 rounded-full border border-lime/30 hover:border-lime hover:text-forest hover:bg-lime-light transition-all duration-200 no-underline"
              >
                Все рецепты
              </Link>
            </div>

            <div className="flex gap-6 flex-wrap">
              {["Без регистрации", "Работает в Telegram", "429 рецептов"].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-[13px] font-medium text-soft">
                  <span className="text-[15px]">✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — cocktail visual */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(160deg, #EBF9EC 0%, #D4F2D8 40%, #B8ECC0 100%)" }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-[300px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)" }} />
          <div className="absolute bottom-14 left-10 w-[200px] h-[200px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(44,200,74,0.2) 0%, transparent 70%)" }} />

          {/* Floating badge — top left */}
          <div className="absolute top-[10%] left-[5%] z-10 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(11,48,24,0.15)]">
            <div className="text-[11px] font-semibold text-soft mb-0.5">🌿 Сейчас популярно</div>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">Мохито</div>
          </div>

          {/* Photo card */}
          {heroRecipe && (
            <div
              className="relative z-10 w-[68%] max-w-[350px] rounded-[32px] overflow-hidden shadow-[0_40px_80px_rgba(11,48,24,0.2),0_12px_28px_rgba(0,0,0,0.1),0_0_0_6px_rgba(255,255,255,0.55)] -rotate-[2.5deg] hover:rotate-[-1deg] hover:scale-[1.025] transition-transform duration-500"
            >
              <Image
                src={getImagePath(heroRecipe)}
                alt="Коктейль"
                width={350}
                height={350}
                className="w-full aspect-square object-cover block"
                priority
              />
            </div>
          )}

          {/* Floating badge — bottom right */}
          <div className="absolute bottom-[14%] right-[4%] z-10 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(11,48,24,0.15)]">
            <div className="text-[11px] font-semibold text-soft mb-0.5">Рецептов в базе</div>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">429 🍸</div>
          </div>
        </div>
      </section>

      {/* ─── КАК ЭТО РАБОТАЕТ ─── */}
      <section className="bg-surface border-t border-lime/15 py-24 px-5 sm:px-14">
        <div className="max-w-[1040px] mx-auto">
          <div className="text-xs font-bold tracking-[2px] uppercase text-lime mb-3">Как это работает</div>
          <h2 className="text-[clamp(28px,3.5vw,46px)] font-extrabold tracking-[-1.5px] text-ink mb-14 leading-[1.1] max-w-[500px]">
            Три шага до идеального коктейля
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: "📱", num: "01", title: "Добавь ингредиенты", desc: "Укажи всё, что есть дома — водка, лайм, мята, ром, что угодно" },
              { icon: "🍹", num: "02", title: "Получи подборку", desc: "Бот мгновенно покажет, какие коктейли можно приготовить прямо сейчас" },
              { icon: "✅", num: "03", title: "Готовь по рецепту", desc: "Пошаговая инструкция с пропорциями — всё понятно с первого раза" },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-white border border-lime/15 rounded-3xl p-9 hover:border-lime/50 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(44,200,74,0.1)] transition-all duration-250"
              >
                <div className="w-[52px] h-[52px] bg-lime-light rounded-2xl flex items-center justify-center text-2xl mb-5">{step.icon}</div>
                <div className="text-[11px] font-bold text-lime tracking-[1px] mb-2">{step.num}</div>
                <div className="text-[18px] font-bold text-ink mb-2.5 tracking-tight">{step.title}</div>
                <p className="text-sm text-muted leading-[1.75]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ПОПУЛЯРНЫЕ РЕЦЕПТЫ ─── */}
      <section className="max-w-[1200px] mx-auto px-5 sm:px-14 py-24">
        <div className="flex items-end justify-between mb-9">
          <h2 className="text-[34px] font-extrabold tracking-[-1.2px] text-ink">Популярные рецепты</h2>
          <Link
            href="/cocktails/"
            className="text-sm font-semibold text-lime hover:gap-2 flex items-center gap-1 transition-all no-underline"
          >
            Все 429 рецептов →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {preview.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/cocktails/${recipe.slug}/`}
              className="group block bg-white rounded-[20px] overflow-hidden border border-lime/15 hover:border-lime/40 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(11,48,24,0.1)] transition-all duration-300 no-underline"
            >
              <div className="relative aspect-[4/3] bg-surface overflow-hidden">
                <Image
                  src={getImagePath(recipe)}
                  alt={`Коктейль ${recipe.name}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-400"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </div>
              <div className="p-3.5">
                <p className="text-sm font-bold text-ink leading-snug line-clamp-2 tracking-tight">{recipe.name}</p>
                <p className="text-xs text-soft mt-1 font-medium">{recipe.ingredients.length} ингр.</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── ФИНАЛЬНЫЙ CTA ─── */}
      <section className="bg-forest px-5 sm:px-14 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
        <div>
          <div className="text-xs font-bold tracking-[2px] uppercase text-lime mb-4">Начать бесплатно</div>
          <h2 className="text-[clamp(32px,4vw,54px)] font-extrabold tracking-[-2px] leading-[1.08] text-white mb-5">
            Готов попробовать?
          </h2>
          <p className="text-[17px] font-light text-white/55 leading-[1.8] mb-10">
            Бесплатно. Работает прямо в Telegram.<br />Никакой регистрации.
          </p>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-lime text-forest font-bold text-[15px] px-11 py-[18px] rounded-full hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(44,200,74,0.45)] transition-all duration-200 no-underline shadow-[0_4px_24px_rgba(44,200,74,0.35)]"
          >
            Открыть @cocktail_generator_bot →
          </a>
        </div>
        <ul className="list-none p-0 m-0">
          {[
            "429 рецептов коктейлей из базы Inshaker",
            "Подбор по ингредиентам из твоего бара",
            "Пошаговые инструкции с пропорциями",
            "Работает в Telegram — без приложений",
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-3.5 text-[16px] text-white/75 py-4 border-b border-white/8 last:border-b-0">
              <div className="w-7 h-7 bg-lime/15 border border-lime/30 rounded-lg flex items-center justify-center text-sm flex-shrink-0">✓</div>
              {feat}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
