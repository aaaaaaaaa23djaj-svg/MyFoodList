import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { AtmospherePicker } from './components/AtmospherePicker';
import { HeaderBar } from './components/HeaderBar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { TikTokExtractor } from './components/TikTokExtractor';
import { getBackgroundById } from './config/backgrounds';
import type {
  AestheticBackgroundId,
  Recipe,
  RecipeStep,
  SortOption,
  StandardizedIngredient,
} from './types/recipe';
import { DEFAULT_CATEGORIES } from './types/recipe';
import { filterAndSortRecipes, getCategoriesWithCounts } from './utils/recipeMetrics';

const BG_STORAGE_KEY = 'tablenote_aesthetic_bg';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

  const [backgroundId, setBackgroundId] = useState<AestheticBackgroundId>(() => {
    try {
      const saved = localStorage.getItem(BG_STORAGE_KEY);
      if (
        saved === 'sunlit-marble' ||
        saved === 'botanical-linen' ||
        saved === 'midnight-bistro' ||
        saved === 'pure-paper'
      ) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'sunlit-marble';
  });

  const extractorInputRef = useRef<HTMLInputElement | null>(null);
  const activeBackground = getBackgroundById(backgroundId);

  useEffect(() => {
    try {
      localStorage.setItem(BG_STORAGE_KEY, backgroundId);
    } catch {
      // ignore storage errors
    }
    if (activeBackground.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [backgroundId, activeBackground.isDark]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRecipes() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/recipes');
        if (!res.ok) {
          throw new Error('Failed to load recipe library.');
        }
        const data = (await res.json()) as { recipes: Recipe[] };
        if (!cancelled) {
          setRecipes(data.recipes || []);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load recipes.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    fetchRecipes();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoriesWithCounts = useMemo(
    () => getCategoriesWithCounts(recipes, DEFAULT_CATEGORIES),
    [recipes]
  );

  const existingCategoryNames = useMemo(
    () => categoriesWithCounts.map((c) => c.name),
    [categoriesWithCounts]
  );

  const visibleRecipes = useMemo(
    () =>
      filterAndSortRecipes(recipes, {
        search: searchQuery,
        category: selectedCategory,
        sort: sortOption,
      }),
    [recipes, searchQuery, selectedCategory, sortOption]
  );

  const activeRecipe = useMemo(
    () => recipes.find((r) => r.id === activeRecipeId) ?? null,
    [recipes, activeRecipeId]
  );

  const handleFocusExtractor = () => {
    extractorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => extractorInputRef.current?.focus(), 200);
  };

  const handleExtract = async (payload: {
    tiktokUrl: string;
    customName?: string;
    categoryHint?: string;
    userNotes?: string;
    uploadedVideo?: { base64: string; mimeType: string; fileName: string };
  }) => {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokUrl: payload.tiktokUrl,
          customName: payload.customName,
          categoryHint: payload.categoryHint,
          userNotes: payload.userNotes,
          uploadedVideo: payload.uploadedVideo
            ? {
                base64: payload.uploadedVideo.base64,
                mimeType: payload.uploadedVideo.mimeType,
              }
            : undefined,
        }),
      });
      const data = (await res.json()) as { recipe?: Recipe; error?: string };
      if (!res.ok || !data.recipe) {
        throw new Error(data.error || 'Failed to extract recipe from TikTok link.');
      }
      setRecipes((prev) => [data.recipe!, ...prev]);
      setSelectedCategory('All');
      setActiveRecipeId(data.recipe.id);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Unable to extract recipe.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpdateRecipe = async (
    id: string,
    patch: {
      title?: string;
      category?: string;
      summary?: string;
      prepMinutes?: number;
      cookMinutes?: number;
      servings?: number;
      ingredients?: StandardizedIngredient[];
      steps?: RecipeStep[];
    }
  ) => {
    const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { recipe?: Recipe; error?: string };
    if (!res.ok || !data.recipe) {
      throw new Error(data.error || 'Failed to update recipe.');
    }
    setRecipes((prev) => prev.map((r) => (r.id === id ? data.recipe! : r)));
  };

  const handleDeleteRecipe = async (id: string) => {
    const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete recipe.');
    }
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setActiveRecipeId(null);
  };

  const handleAddReview = async (
    id: string,
    review: { authorName: string; rating: number; comment: string }
  ) => {
    const res = await fetch(`/api/recipes/${encodeURIComponent(id)}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    const data = (await res.json()) as { recipe?: Recipe; error?: string };
    if (!res.ok || !data.recipe) {
      throw new Error(data.error || 'Failed to submit review.');
    }
    setRecipes((prev) => prev.map((r) => (r.id === id ? data.recipe! : r)));
  };

  return (
    <div id="top" className={`min-h-screen relative ${activeBackground.canvasBgClass}`}>
      {/* Aesthetic Fixed Background Layer */}
      {activeBackground.imageUrl && (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
          <img
            src={activeBackground.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 ${activeBackground.scrimClass}`} />
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col">
        <HeaderBar onFocusExtractor={handleFocusExtractor} />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
          <TikTokExtractor
            inputRef={extractorInputRef}
            existingCategories={existingCategoryNames}
            onExtract={handleExtract}
            isExtracting={isExtracting}
            serverError={extractError}
            onClearError={() => setExtractError(null)}
          />

          {/* Recipe Library & Category / Sort Toolbar */}
          <section
            id="library"
            aria-labelledby="library-heading"
            className="bg-white/88 dark:bg-stone-900/88 backdrop-blur-md border border-stone-200/90 dark:border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2
                  id="library-heading"
                  className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100"
                >
                  Saved Recipes
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-300 mt-0.5 tabular-nums">
                  Showing {visibleRecipes.length} of {recipes.length}{' '}
                  {recipes.length === 1 ? 'recipe' : 'recipes'}
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search recipes"
                    placeholder="Search dish, ingredient, creator..."
                    className="w-full sm:w-72 pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="relative flex items-center">
                  <ArrowUpDown
                    className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    aria-label="Sort recipes"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="w-full sm:w-auto pl-8 pr-8 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="rating-desc">Highest rated</option>
                    <option value="prep-asc">Quickest total time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div
              id="categories"
              role="tablist"
              aria-label="Filter recipes by category"
              className="flex flex-wrap items-center gap-2 pb-2 border-b border-stone-200/80 dark:border-stone-800"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'All'}
                onClick={() => setSelectedCategory('All')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  selectedCategory === 'All'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                All · {recipes.length}
              </button>
              {categoriesWithCounts.map(({ name, count }) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === name}
                  onClick={() => setSelectedCategory(name)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    selectedCategory === name
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {name} · {count}
                </button>
              ))}
            </div>

            {loadError ? (
              <div
                role="alert"
                className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-800 dark:text-red-300"
              >
                {loadError}
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-80 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-800/50 animate-pulse"
                  />
                ))}
              </div>
            ) : visibleRecipes.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-xl border border-dashed border-stone-300 dark:border-stone-700 space-y-3">
                <p className="font-display text-lg font-medium text-stone-900 dark:text-stone-100">
                  No recipes match this view
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Try clearing your search or category filter, or paste a new TikTok link above.
                </p>
                {(selectedCategory !== 'All' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div
                data-testid="recipe-grid"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {visibleRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onSelect={(item) => setActiveRecipeId(item.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <AtmospherePicker selectedId={backgroundId} onSelect={setBackgroundId} />
        </main>

        <footer className="max-w-6xl w-full mx-auto px-4 sm:px-8 pb-8 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
          <span>TableNote — Personal TikTok Recipe Library</span>
          <span>Standardized ingredients, visual & audio step extraction</span>
        </footer>
      </div>

      {activeRecipe && (
        <RecipeDetailModal
          recipe={activeRecipe}
          existingCategories={existingCategoryNames}
          onClose={() => setActiveRecipeId(null)}
          onUpdate={handleUpdateRecipe}
          onDelete={handleDeleteRecipe}
          onAddReview={handleAddReview}
        />
      )}
    </div>
  );
}
