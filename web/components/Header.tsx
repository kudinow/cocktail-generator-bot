import Link from "next/link";
import { BOT_URL, SITE_NAME } from "@/lib/config";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-5 sm:px-14 h-[68px] sticky top-0 bg-white/90 backdrop-blur-lg border-b border-lime/20 z-50">
      <Link
        href="/"
        className="text-[18px] font-extrabold text-forest tracking-tight flex items-center gap-2.5 no-underline"
      >
        <div className="w-[34px] h-[34px] bg-lime rounded-[10px] flex items-center justify-center text-[18px] shrink-0">
          🍸
        </div>
        {SITE_NAME}
      </Link>
      <nav className="flex items-center gap-1">
        <Link
          href="/cocktails/"
          className="hidden sm:block text-sm font-medium text-muted px-[18px] py-2 rounded-full hover:text-forest hover:bg-lime-light transition-all duration-200 no-underline"
        >
          Рецепты
        </Link>
        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold bg-lime text-white px-[18px] py-2 rounded-full hover:bg-[#24B040] transition-all duration-200 shadow-[0_4px_16px_rgba(44,200,74,0.35)] hover:-translate-y-px no-underline"
        >
          Открыть бота
        </a>
      </nav>
    </header>
  );
}
