import type { Recipe, RecipeReview, SortOption } from '../types/recipe';

export interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function validateTikTokUrl(input: string): {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please paste a TikTok video link.' };
  }

  let withProtocol = trimmed;
  if (!/^https?:\/\//i.test(withProtocol)) {
    withProtocol = `https://${withProtocol}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: 'Enter a valid URL starting with https://www.tiktok.com/...' };
  }

  const host = parsed.hostname.toLowerCase();
  const isTikTokHost =
    host === 'tiktok.com' ||
    host.endsWith('.tiktok.com');

  if (!isTikTokHost) {
    return {
      valid: false,
      error: 'Link must be a TikTok URL (tiktok.com, vm.tiktok.com, or vt.tiktok.com).',
    };
  }

  if (parsed.pathname === '/' || parsed.pathname.length < 2) {
    return {
      valid: false,
      error: 'Please paste a specific TikTok video URL rather than the TikTok homepage.',
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

export function calculateAverageRating(reviews: RecipeReview[]): RatingSummary {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!reviews || reviews.length === 0) {
    return { average: 0, count: 0, distribution };
  }

  let total = 0;
  let validCount = 0;

  for (const review of reviews) {
    const rounded = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    if (Number.isFinite(review.rating)) {
      distribution[rounded] += 1;
      total += review.rating;
      validCount += 1;
    }
  }

  if (validCount === 0) {
    return { average: 0, count: 0, distribution };
  }

  return {
    average: Math.round((total / validCount) * 10) / 10,
    count: validCount,
    distribution,
  };
}

export function filterAndSortRecipes(
  recipes: Recipe[],
  options: { search: string; category: string; sort: SortOption }
): Recipe[] {
  const query = options.search.trim().toLowerCase();
  const category = options.category;

  const filtered = recipes.filter((recipe) => {
    if (category && category !== 'All' && recipe.category !== category) {
      return false;
    }
    if (!query) return true;

    const inTitle = recipe.title.toLowerCase().includes(query);
    const inCategory = recipe.category.toLowerCase().includes(query);
    const inCreator = recipe.creatorHandle.toLowerCase().includes(query);
    const inSummary = recipe.summary.toLowerCase().includes(query);
    const inIngredients = recipe.ingredients.some((item) =>
      item.ingredient.toLowerCase().includes(query)
    );

    return inTitle || inCategory || inCreator || inSummary || inIngredients;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (options.sort) {
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name-asc':
        return a.title.localeCompare(b.title);
      case 'name-desc':
        return b.title.localeCompare(a.title);
      case 'rating-desc': {
        const ratingA = calculateAverageRating(a.reviews);
        const ratingB = calculateAverageRating(b.reviews);
        if (ratingB.average !== ratingA.average) {
          return ratingB.average - ratingA.average;
        }
        return ratingB.count - ratingA.count;
      }
      case 'prep-asc':
        return a.prepMinutes + a.cookMinutes - (b.prepMinutes + b.cookMinutes);
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return sorted;
}

export function getCategoriesWithCounts(
  recipes: Recipe[],
  baseCategories: string[]
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();

  for (const cat of baseCategories) {
    counts.set(cat, 0);
  }

  for (const recipe of recipes) {
    const current = counts.get(recipe.category) ?? 0;
    counts.set(recipe.category, current + 1);
  }

  return Array.from(counts.entries())
    .filter(([name, count]) => count > 0 || baseCategories.includes(name))
    .map(([name, count]) => ({ name, count }));
}
