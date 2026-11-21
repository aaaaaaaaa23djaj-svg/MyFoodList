import { useState } from 'react';
import { Utensils } from 'lucide-react';
import type { Recipe } from '../types/recipe';
import { calculateAverageRating } from '../utils/recipeMetrics';
import { StarRatingDisplay } from './StarRating';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onSelect }: RecipeCardProps) {
  const [imageError, setImageError] = useState(false);
  const ratingSummary = calculateAverageRating(recipe.reviews);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <article className="group flex flex-col rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white/92 dark:bg-stone-900/92 backdrop-blur-sm overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 shadow-xs">
      <button
        type="button"
        onClick={() => onSelect(recipe)}
        aria-label={`Open recipe: ${recipe.title}`}
        className="text-left flex flex-col flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800 relative">
          {recipe.thumbnailUrl && !imageError ? (
            <img
              src={recipe.thumbnailUrl}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-stone-200 to-stone-100 dark:from-stone-800 dark:to-stone-900 text-stone-500 dark:text-stone-400 text-center">
              <Utensils className="w-7 h-7 mb-2 opacity-70" aria-hidden="true" />
              <span className="font-display text-sm font-medium text-stone-700 dark:text-stone-300 line-clamp-2">
                {recipe.title}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span className="font-medium text-emerald-800 dark:text-emerald-400">
              {recipe.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{totalMinutes} min</span>
            <span aria-hidden="true">·</span>
            {ratingSummary.count > 0 ? (
              <span className="inline-flex items-center gap-1 tabular-nums text-stone-700 dark:text-stone-200 font-medium">
                <StarRatingDisplay rating={ratingSummary.average} size="sm" />
                <span>{ratingSummary.average.toFixed(1)}</span>
                <span className="text-stone-400 dark:text-stone-500 font-normal">
                  ({ratingSummary.count})
                </span>
              </span>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>

          <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-100 leading-snug mb-2 group-hover:text-emerald-900 dark:group-hover:text-emerald-300 transition-colors">
            {recipe.title}
          </h3>

          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-2 mb-4 flex-1">
            {recipe.summary}
          </p>

          <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
            <span className="truncate">{recipe.creatorHandle}</span>
            <span className="shrink-0">
              {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
