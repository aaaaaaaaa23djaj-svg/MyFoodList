import test from 'node:test';
import assert from 'node:assert/strict';
import type { Recipe } from '../types/recipe';
import {
  calculateAverageRating,
  filterAndSortRecipes,
  getCategoriesWithCounts,
  validateTikTokUrl,
} from './recipeMetrics';

const makeRecipe = (overrides: Partial<Recipe>): Recipe => ({
  id: 'id-1',
  title: 'Test Recipe',
  category: 'Quick Dinners',
  tiktokUrl: 'https://www.tiktok.com/@chef/video/123456',
  creatorHandle: '@chef',
  prepMinutes: 10,
  cookMinutes: 15,
  servings: 2,
  summary: 'Simple summary',
  ingredients: [{ ingredient: 'flour', quantity: 1, unit: 'cup' }],
  steps: [{ stepNumber: 1, instruction: 'Mix ingredients.', cueSource: 'visual' }],
  reviews: [],
  extractionSource: 'tiktok-metadata',
  createdAt: '2026-11-10T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z',
  ...overrides,
});

test('validates TikTok URLs accurately', () => {
  assert.equal(validateTikTokUrl('').valid, false);
  assert.equal(validateTikTokUrl('https://youtube.com/watch?v=123').valid, false);
  assert.equal(validateTikTokUrl('https://www.tiktok.com/').valid, false);
  assert.equal(
    validateTikTokUrl('https://www.tiktok.com/@pastaqueen/video/73219481239').valid,
    true
  );
  assert.equal(validateTikTokUrl('vm.tiktok.com/ZM6abc123/').valid, true);
});

test('calculates average rating and star distribution', () => {
  const summary = calculateAverageRating([
    { id: '1', authorName: 'Maya', rating: 5, comment: 'Great', createdAt: '2026-11-01' },
    { id: '2', authorName: 'Liam', rating: 4, comment: 'Good', createdAt: '2026-11-02' },
    { id: '3', authorName: 'Zoe', rating: 5, comment: 'Loved it', createdAt: '2026-11-03' },
  ]);

  assert.equal(summary.count, 3);
  assert.equal(summary.average, 4.7);
  assert.equal(summary.distribution[5], 2);
  assert.equal(summary.distribution[4], 1);
  assert.equal(summary.distribution[1], 0);
});

test('filters by category/search and sorts by name, rating, and prep time', () => {
  const recipes: Recipe[] = [
    makeRecipe({
      id: '1',
      title: 'Zucchini Pasta',
      category: 'Pasta & Noodles',
      prepMinutes: 20,
      cookMinutes: 20,
      createdAt: '2026-11-01T00:00:00Z',
      reviews: [{ id: 'r1', authorName: 'A', rating: 3, comment: 'Ok', createdAt: '2026-11-01' }],
    }),
    makeRecipe({
      id: '2',
      title: 'Almond Matcha',
      category: 'Drinks & Matcha',
      prepMinutes: 5,
      cookMinutes: 0,
      createdAt: '2026-11-05T00:00:00Z',
      reviews: [{ id: 'r2', authorName: 'B', rating: 5, comment: 'Amazing', createdAt: '2026-11-05' }],
    }),
  ];

  const byName = filterAndSortRecipes(recipes, { search: '', category: 'All', sort: 'name-asc' });
  assert.equal(byName[0].title, 'Almond Matcha');

  const byRating = filterAndSortRecipes(recipes, { search: '', category: 'All', sort: 'rating-desc' });
  assert.equal(byRating[0].id, '2');

  const byPrep = filterAndSortRecipes(recipes, { search: '', category: 'All', sort: 'prep-asc' });
  assert.equal(byPrep[0].id, '2');

  const pastaOnly = filterAndSortRecipes(recipes, {
    search: '',
    category: 'Pasta & Noodles',
    sort: 'newest',
  });
  assert.equal(pastaOnly.length, 1);
  assert.equal(pastaOnly[0].id, '1');

  const categoryCounts = getCategoriesWithCounts(recipes, ['Pasta & Noodles', 'Drinks & Matcha']);
  assert.equal(categoryCounts.find((c) => c.name === 'Pasta & Noodles')?.count, 1);
});
