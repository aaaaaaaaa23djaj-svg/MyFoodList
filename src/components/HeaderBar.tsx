interface HeaderBarProps {
  onFocusExtractor: () => void;
}

export function HeaderBar({ onFocusExtractor }: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/85 dark:bg-stone-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          TableNote
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-stone-300"
        >
          <a
            href="#extractor"
            className="hover:text-stone-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Extractor
          </a>
          <a
            href="#library"
            className="hover:text-stone-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Recipe Library
          </a>
          <a
            href="#categories"
            className="hover:text-stone-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Categories
          </a>
          <a
            href="#atmosphere"
            className="hover:text-stone-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Backgrounds
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onFocusExtractor}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            New Recipe
          </button>
        </div>
      </div>
    </header>
  );
}
