export type StandardizedUnit =
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'oz'
  | 'fl oz'
  | 'lb'
  | 'clove'
  | 'pinch'
  | 'slice'
  | 'piece'
  | 'bunch'
  | 'sprig'
  | 'can'
  | 'stick'
  | 'handful'
  | 'to taste'
  | 'unit';

export interface StandardizedIngredient {
  ingredient: string;
  quantity: number | null;
  unit: StandardizedUnit;
  notes?: string;
  raw?: string;
}

export type StepCueSource = 'visual' | 'audio' | 'caption' | 'inferred';

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  cueSource: StepCueSource;
  timestampHint?: string;
  durationMinutes?: number;
}

export interface RecipeReview {
  id: string;
  authorName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export type ExtractionSource = 'video-multimodal' | 'tiktok-metadata' | 'user-assisted';

export interface Recipe {
  id: string;
  title: string;
  category: string;
  tiktokUrl: string;
  creatorHandle: string;
  thumbnailUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  summary: string;
  ingredients: StandardizedIngredient[];
  steps: RecipeStep[];
  reviews: RecipeReview[];
  extractionSource: ExtractionSource;
  createdAt: string;
  updatedAt: string;
}

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'rating-desc'
  | 'prep-asc';

export type AestheticBackgroundId =
  | 'sunlit-marble'
  | 'botanical-linen'
  | 'midnight-bistro'
  | 'pure-paper';

export const DEFAULT_CATEGORIES: string[] = [
  'Pasta & Noodles',
  'Seafood & Sushi',
  'Quick Dinners',
  'Drinks & Matcha',
  'Desserts & Baking',
  'Breakfast & Brunch',
  'Salads & Bowls',
  'Snacks & Bites',
];
