import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIngredientDisplay,
  normalizeUnit,
  parseIngredientPhrase,
  parseQuantity,
  standardizeIngredients,
} from './ingredients';

test('parses "1 cup of flour" into standardized format', () => {
  const result = parseIngredientPhrase('1 cup of flour');
  assert.equal(result.ingredient, 'flour');
  assert.equal(result.quantity, 1);
  assert.equal(result.unit, 'cup');
});

test('handles unit aliases and plural variations', () => {
  assert.equal(normalizeUnit('cups'), 'cup');
  assert.equal(normalizeUnit('Tablespoons'), 'tbsp');
  assert.equal(normalizeUnit('teaspoon'), 'tsp');
  assert.equal(normalizeUnit('grams'), 'g');
  assert.equal(normalizeUnit('gm'), 'g');
  assert.equal(normalizeUnit('ounces'), 'oz');
  assert.equal(normalizeUnit('pounds'), 'lb');
  assert.equal(normalizeUnit('millilitres'), 'ml');
});

test('parses fractions, mixed numbers, unicode fractions, and ranges', () => {
  assert.equal(parseQuantity('1/2'), 0.5);
  assert.equal(parseQuantity('1 1/2'), 1.5);
  assert.equal(parseQuantity('½'), 0.5);
  assert.equal(parseQuantity('2 ½'), 2.5);
  assert.equal(parseQuantity('2-3'), 2.5);
});

test('extracts prep notes and normalizes ingredient synonyms', () => {
  const butter = parseIngredientPhrase('250 grams unsalted butter, softened');
  assert.equal(butter.ingredient, 'unsalted butter');
  assert.equal(butter.quantity, 250);
  assert.equal(butter.unit, 'g');
  assert.equal(butter.notes, 'softened');

  const scallions = parseIngredientPhrase('3 green onions, thinly sliced');
  assert.equal(scallions.ingredient, 'scallions');
  assert.equal(scallions.quantity, 3);
  assert.equal(scallions.unit, 'unit');
  assert.equal(scallions.notes, 'thinly sliced');

  const garlic = parseIngredientPhrase('4 cloves of garlic');
  assert.equal(garlic.ingredient, 'garlic');
  assert.equal(garlic.quantity, 4);
  assert.equal(garlic.unit, 'clove');
});

test('standardizes mixed arrays of strings and partial objects', () => {
  const list = standardizeIngredients([
    '1 cup of flour',
    { ingredient: 'Granulated Sugar', quantity: 0.5, unit: 'cups' },
    'Flaky sea salt to taste',
  ]);

  assert.equal(list.length, 3);
  assert.deepEqual(
    { ingredient: list[0].ingredient, quantity: list[0].quantity, unit: list[0].unit },
    { ingredient: 'flour', quantity: 1, unit: 'cup' }
  );
  assert.deepEqual(
    { ingredient: list[1].ingredient, quantity: list[1].quantity, unit: list[1].unit },
    { ingredient: 'granulated sugar', quantity: 0.5, unit: 'cup' }
  );
  assert.equal(list[2].unit, 'to taste');
  assert.equal(formatIngredientDisplay(list[1]), '½ cup granulated sugar');
});
