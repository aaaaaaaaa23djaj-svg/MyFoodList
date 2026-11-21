import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import type {
  Recipe,
  RecipeStep,
  StandardizedIngredient,
  StandardizedUnit,
  StepCueSource,
} from '../types/recipe';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { formatIngredientDisplay, formatQuantity } from '../utils/ingredients';
import { calculateAverageRating } from '../utils/recipeMetrics';
import { StarRatingDisplay, StarRatingInput } from './StarRating';

interface RecipeDetailModalProps {
  recipe: Recipe;
  existingCategories: string[];
  onClose: () => void;
  onUpdate: (
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
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddReview: (
    id: string,
    review: { authorName: string; rating: number; comment: string }
  ) => Promise<void>;
}

const STANDARD_UNITS: StandardizedUnit[] = [
  'cup',
  'tbsp',
  'tsp',
  'g',
  'kg',
  'ml',
  'l',
  'oz',
  'fl oz',
  'lb',
  'clove',
  'pinch',
  'slice',
  'piece',
  'bunch',
  'sprig',
  'can',
  'stick',
  'handful',
  'to taste',
  'unit',
];

const CUE_LABEL: Record<StepCueSource, string> = {
  visual: 'Visual cue',
  audio: 'Audio cue',
  caption: 'Video caption',
  inferred: 'Inferred cue',
};

export function RecipeDetailModal({
  recipe,
  existingCategories,
  onClose,
  onUpdate,
  onDelete,
  onAddReview,
}: RecipeDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [ingredientView, setIngredientView] = useState<'checklist' | 'standardized'>('checklist');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Edit form state
  const [editTitle, setEditTitle] = useState(recipe.title);
  const [editCategory, setEditCategory] = useState(recipe.category);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [editSummary, setEditSummary] = useState(recipe.summary);
  const [editPrep, setEditPrep] = useState(recipe.prepMinutes);
  const [editCook, setEditCook] = useState(recipe.cookMinutes);
  const [editServings, setEditServings] = useState(recipe.servings);
  const [editIngredients, setEditIngredients] = useState<StandardizedIngredient[]>(recipe.ingredients);
  const [editSteps, setEditSteps] = useState<RecipeStep[]>(recipe.steps);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    setEditTitle(recipe.title);
    setEditCategory(recipe.category);
    setEditSummary(recipe.summary);
    setEditPrep(recipe.prepMinutes);
    setEditCook(recipe.cookMinutes);
    setEditServings(recipe.servings);
    setEditIngredients(recipe.ingredients);
    setEditSteps(recipe.steps);
    setImageError(false);
  }, [recipe]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const ratingSummary = calculateAverageRating(recipe.reviews);
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...existingCategories, recipe.category])
  );

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalCategory =
        editCategory === '__custom__' ? customCategoryInput.trim() || recipe.category : editCategory;

      await onUpdate(recipe.id, {
        title: editTitle.trim() || recipe.title,
        category: finalCategory,
        summary: editSummary.trim(),
        prepMinutes: editPrep,
        cookMinutes: editCook,
        servings: editServings,
        ingredients: editIngredients.filter((ing) => ing.ingredient.trim().length > 0),
        steps: editSteps
          .filter((st) => st.instruction.trim().length > 0)
          .map((st, idx) => ({ ...st, stepNumber: idx + 1 })),
      });
      setIsEditing(false);
      setCustomCategoryInput('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      setReviewError('Please write a review before submitting.');
      return;
    }
    setReviewError(null);
    setIsSubmittingReview(true);
    try {
      await onAddReview(recipe.id, {
        authorName: reviewAuthor.trim() || 'Home Cook',
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewAuthor('');
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to save review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 shadow-2xl">
        {/* Sticky modal action bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 truncate">
            <span className="font-medium text-emerald-800 dark:text-emerald-400">
              {recipe.category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{recipe.creatorHandle}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              {isEditing ? 'Cancel Edit' : 'Rename & Edit'}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label={`Delete ${recipe.title}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Delete
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onDelete(recipe.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-700 text-white hover:bg-red-800 cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close recipe details"
              className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-recipe-title"
                    className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1"
                  >
                    Recipe Name
                  </label>
                  <input
                    id="edit-recipe-title"
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base font-medium rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-recipe-category"
                    className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="edit-recipe-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">New custom category...</option>
                  </select>
                  {editCategory === '__custom__' && (
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Custom category name"
                      aria-label="Custom category name"
                      className="mt-2 w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label
                      htmlFor="edit-prep-min"
                      className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1"
                    >
                      Prep (m)
                    </label>
                    <input
                      id="edit-prep-min"
                      type="number"
                      min={0}
                      value={editPrep}
                      onChange={(e) => setEditPrep(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-cook-min"
                      className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1"
                    >
                      Cook (m)
                    </label>
                    <input
                      id="edit-cook-min"
                      type="number"
                      min={0}
                      value={editCook}
                      onChange={(e) => setEditCook(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-servings"
                      className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1"
                    >
                      Servings
                    </label>
                    <input
                      id="edit-servings"
                      type="number"
                      min={1}
                      value={editServings}
                      onChange={(e) => setEditServings(Number(e.target.value))}
                      className="w-full px-2.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 tabular-nums"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="edit-summary"
                    className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1"
                  >
                    Summary
                  </label>
                  <textarea
                    id="edit-summary"
                    rows={2}
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              </div>

              {/* Editable standardized ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Standardized Ingredients</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setEditIngredients((prev) => [
                        ...prev,
                        { ingredient: '', quantity: 1, unit: 'cup' },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Add Ingredient
                  </button>
                </div>
                <div className="space-y-2">
                  {editIngredients.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="number"
                        step="any"
                        placeholder="Qty"
                        aria-label={`Ingredient ${idx + 1} quantity`}
                        value={item.quantity ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          setEditIngredients((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, quantity: val } : row))
                          );
                        }}
                        className="col-span-2 px-2.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 tabular-nums"
                      />
                      <select
                        aria-label={`Ingredient ${idx + 1} unit`}
                        value={item.unit}
                        onChange={(e) => {
                          const unit = e.target.value as StandardizedUnit;
                          setEditIngredients((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, unit } : row))
                          );
                        }}
                        className="col-span-3 px-2 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      >
                        {STANDARD_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Ingredient name"
                        aria-label={`Ingredient ${idx + 1} name`}
                        value={item.ingredient}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditIngredients((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, ingredient: val } : row))
                          );
                        }}
                        className="col-span-4 px-2.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                      <input
                        type="text"
                        placeholder="Notes"
                        aria-label={`Ingredient ${idx + 1} notes`}
                        value={item.notes ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditIngredients((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, notes: val || undefined } : row
                            )
                          );
                        }}
                        className="col-span-2 px-2.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ingredient ${idx + 1}`}
                        onClick={() =>
                          setEditIngredients((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="col-span-1 p-2 text-stone-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable numbered steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Numbered Cooking Steps</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSteps((prev) => [
                        ...prev,
                        {
                          stepNumber: prev.length + 1,
                          instruction: '',
                          cueSource: 'inferred',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {editSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-mono-tabular text-xs text-stone-400 pt-2.5 w-6">
                        {idx + 1}.
                      </span>
                      <textarea
                        rows={2}
                        aria-label={`Step ${idx + 1} instruction`}
                        value={step.instruction}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditSteps((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, instruction: val } : s))
                          );
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                      <button
                        type="button"
                        aria-label={`Remove step ${idx + 1}`}
                        onClick={() => setEditSteps((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 text-stone-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Hero header with image & prominent average rating */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                <div className="md:col-span-5 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 aspect-[4/3] md:aspect-auto">
                  {recipe.thumbnailUrl && !imageError ? (
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.title}
                      referrerPolicy="no-referrer"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full min-h-48 flex flex-col items-center justify-center p-6 text-stone-400">
                      <Utensils className="w-8 h-8 mb-2" aria-hidden="true" />
                      <span className="text-xs">{recipe.creatorHandle}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-2">
                      <span className="font-medium text-emerald-800 dark:text-emerald-400">
                        {recipe.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Prep {recipe.prepMinutes}m</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Cook {recipe.cookMinutes}m</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{recipe.servings} servings</span>
                    </div>

                    <h2
                      id="recipe-detail-title"
                      className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100 leading-tight mb-3"
                    >
                      {recipe.title}
                    </h2>

                    <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed">
                      {recipe.summary}
                    </p>
                  </div>

                  {/* Prominent Average Rating Summary Box */}
                  <div
                    data-testid="prominent-rating-summary"
                    className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-display text-3xl font-semibold tabular-nums text-stone-900 dark:text-stone-100 leading-none">
                          {ratingSummary.count > 0 ? ratingSummary.average.toFixed(1) : '—'}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          out of 5
                        </div>
                      </div>
                      <div>
                        <StarRatingDisplay rating={ratingSummary.average} size="md" />
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 tabular-nums">
                          {ratingSummary.count}{' '}
                          {ratingSummary.count === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>
                    </div>

                    <a
                      href={recipe.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:text-emerald-800 dark:hover:text-emerald-400 underline underline-offset-4"
                    >
                      Watch original TikTok ({recipe.creatorHandle})
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Ingredients & Steps two-column editorial layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-stone-200 dark:border-stone-800">
                {/* Standardized Ingredients */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold">Ingredients</h3>
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => setIngredientView('checklist')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          ingredientView === 'checklist'
                            ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                            : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        Checklist
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngredientView('standardized')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                          ingredientView === 'standardized'
                            ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                            : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        Standardized
                      </button>
                    </div>
                  </div>

                  {ingredientView === 'checklist' ? (
                    <ul className="divide-y divide-stone-200/80 dark:divide-stone-800/80">
                      {recipe.ingredients.map((item, idx) => {
                        const checked = Boolean(checkedIngredients[idx]);
                        return (
                          <li key={idx} className="py-2.5">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setCheckedIngredients((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                }
                                className="mt-1 w-4 h-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-700"
                              />
                              <span
                                className={`text-sm leading-relaxed ${
                                  checked
                                    ? 'line-through text-stone-400 dark:text-stone-500'
                                    : 'text-stone-800 dark:text-stone-200'
                                }`}
                              >
                                {formatIngredientDisplay(item)}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
                          <tr>
                            <th className="py-2.5 px-3 font-medium">Qty</th>
                            <th className="py-2.5 px-3 font-medium">Unit</th>
                            <th className="py-2.5 px-3 font-medium">Ingredient</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                          {recipe.ingredients.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-mono-tabular text-stone-700 dark:text-stone-300">
                                {item.quantity !== null ? formatQuantity(item.quantity) : '—'}
                              </td>
                              <td className="py-2 px-3 font-mono-tabular text-emerald-800 dark:text-emerald-400">
                                {item.unit}
                              </td>
                              <td className="py-2 px-3 text-stone-900 dark:text-stone-100">
                                {item.ingredient}
                                {item.notes ? (
                                  <span className="text-stone-500 dark:text-stone-400">
                                    {' '}
                                    ({item.notes})
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Numbered Cooking Instructions */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="font-display text-xl font-semibold">
                    Step-by-Step Instructions
                  </h3>
                  <ol className="space-y-4">
                    {recipe.steps.map((step, idx) => {
                      const done = Boolean(checkedSteps[idx]);
                      return (
                        <li
                          key={step.stepNumber}
                          className={`p-4 rounded-xl border transition-colors ${
                            done
                              ? 'border-stone-200/60 dark:border-stone-800/60 bg-stone-50/60 dark:bg-stone-900/40'
                              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/70'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))
                              }
                              aria-label={`Mark step ${step.stepNumber} as ${done ? 'incomplete' : 'complete'}`}
                              className={`mt-0.5 w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                                done
                                  ? 'bg-emerald-800 border-emerald-800 text-white'
                                  : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-emerald-700'
                              }`}
                            >
                              {done ? (
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              ) : (
                                step.stepNumber
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm leading-relaxed ${
                                  done
                                    ? 'line-through text-stone-400 dark:text-stone-500'
                                    : 'text-stone-800 dark:text-stone-200'
                                }`}
                              >
                                {step.instruction}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-2 tabular-nums">
                                <span>{CUE_LABEL[step.cueSource]}</span>
                                {step.timestampHint && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono-tabular">{step.timestampHint}</span>
                                  </>
                                )}
                                {step.durationMinutes && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>~{step.durationMinutes} min</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Ratings & Written Reviews Section */}
              <div className="pt-8 border-t border-stone-200 dark:border-stone-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-semibold">Ratings & Reviews</h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                      Share your cooking notes and rate this TikTok recipe from 1 to 5 stars.
                    </p>
                  </div>

                  {ratingSummary.count > 0 && (
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <span key={star}>
                          {star}★ ({ratingSummary.distribution[star as 1 | 2 | 3 | 4 | 5]})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <form
                    onSubmit={handleSubmitReview}
                    className="lg:col-span-5 p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 space-y-4 h-fit"
                  >
                    <div>
                      <span className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                        Your Rating
                      </span>
                      <StarRatingInput value={reviewRating} onChange={setReviewRating} />
                    </div>

                    <div>
                      <label
                        htmlFor="review-author-input"
                        className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Your Name
                      </label>
                      <input
                        id="review-author-input"
                        type="text"
                        value={reviewAuthor}
                        onChange={(e) => setReviewAuthor(e.target.value)}
                        placeholder="e.g. Jordan Lee"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="review-comment-input"
                        className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Written Review
                      </label>
                      <textarea
                        id="review-comment-input"
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => {
                          setReviewComment(e.target.value);
                          if (reviewError) setReviewError(null);
                        }}
                        placeholder="How did the texture, seasoning, or timing turn out?"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>

                    {reviewError && (
                      <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                        {reviewError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-950 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>

                  <div className="lg:col-span-7 space-y-4">
                    {recipe.reviews.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-sm text-stone-500 dark:text-stone-400">
                        No written reviews yet. Be the first to rate this recipe.
                      </div>
                    ) : (
                      recipe.reviews.map((rev) => (
                        <article
                          key={rev.id}
                          className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                {rev.authorName}
                              </span>
                              <StarRatingDisplay rating={rev.rating} size="sm" />
                            </div>
                            <time
                              dateTime={rev.createdAt}
                              className="text-xs text-stone-500 dark:text-stone-400 tabular-nums"
                            >
                              {new Date(rev.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </time>
                          </div>
                          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                            {rev.comment}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
