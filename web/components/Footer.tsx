import Link from "next/link";
import { BOT_URL, BOT_NAME, SITE_NAME } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="bg-forest border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-14 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="/" className="text-base font-extrabold text-white/70 tracking-tight no-underline">
          {SITE_NAME}
        </a>
        <div className="flex items-center gap-6">
          <Link
            href="/cocktails/"
            className="text-sm text-white/40 hover:text-white/80 transition-colors no-underline"
          >
            Все рецепты
          </Link>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/40 hover:text-white/80 transition-colors no-underline"
          >
            {BOT_NAME}
          </a>
        </div>
        <div className="text-xs text-white/30">
          © {new Date().getFullYear()} {SITE_NAME}
        </div>
      </div>
    </footer>
  );
}
