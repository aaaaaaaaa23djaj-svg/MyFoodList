import type { StandardizedIngredient, StandardizedUnit } from '../types/recipe';

const UNIT_ALIASES: Record<string, StandardizedUnit> = {
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  'c.': 'cup',
  tbsp: 'tbsp',
  tbs: 'tbsp',
  tb: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  'tbsp.': 'tbsp',
  tsp: 'tsp',
  ts: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  'tsp.': 'tsp',
  g: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',
  'g.': 'g',
  kg: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  mls: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  'oz.': 'oz',
  'fl oz': 'fl oz',
  'fl. oz.': 'fl oz',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  'lb.': 'lb',
  clove: 'clove',
  cloves: 'clove',
  pinch: 'pinch',
  pinches: 'pinch',
  dash: 'pinch',
  dashes: 'pinch',
  slice: 'slice',
  slices: 'slice',
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  bunch: 'bunch',
  bunches: 'bunch',
  sprig: 'sprig',
  sprigs: 'sprig',
  can: 'can',
  cans: 'can',
  tin: 'can',
  tins: 'can',
  stick: 'stick',
  sticks: 'stick',
  handful: 'handful',
  handfuls: 'handful',
  'to taste': 'to taste',
  'as needed': 'to taste',
  unit: 'unit',
  units: 'unit',
  whole: 'unit',
};

const UNICODE_FRACTIONS: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  half: 0.5,
  quarter: 0.25,
};

const INGREDIENT_SYNONYMS: Record<string, string> = {
  'all purpose flour': 'all-purpose flour',
  'ap flour': 'all-purpose flour',
  'plain flour': 'flour',
  'green onion': 'scallions',
  'green onions': 'scallions',
  'spring onion': 'scallions',
  'spring onions': 'scallions',
  scallion: 'scallions',
  'extra-virgin olive oil': 'extra virgin olive oil',
  evoo: 'extra virgin olive oil',
  'parmesan cheese': 'parmesan',
  'parmigiano reggiano': 'parmesan',
  'parmigiano-reggiano': 'parmesan',
  'sea salt flakes': 'flaky sea salt',
  'red pepper flakes': 'crushed red pepper flakes',
  'chili flakes': 'crushed red pepper flakes',
  'caster sugar': 'granulated sugar',
  'white sugar': 'granulated sugar',
  'confectioners sugar': 'powdered sugar',
  'icing sugar': 'powdered sugar',
  coriander: 'cilantro',
};

export function normalizeUnit(rawUnit?: string | null): StandardizedUnit {
  if (!rawUnit) return 'unit';
  const cleaned = rawUnit.trim().toLowerCase().replace(/\s+/g, ' ');
  if (cleaned === 't') return 'tsp';
  if (rawUnit.trim() === 'T') return 'tbsp';
  if (UNIT_ALIASES[cleaned]) {
    return UNIT_ALIASES[cleaned];
  }
  const withoutTrailingPeriod = cleaned.replace(/\.$/, '');
  if (UNIT_ALIASES[withoutTrailingPeriod]) {
    return UNIT_ALIASES[withoutTrailingPeriod];
  }
  return 'unit';
}

export function parseQuantity(rawQty: string | number | null | undefined): number | null {
  if (rawQty === null || rawQty === undefined) return null;
  if (typeof rawQty === 'number') {
    return Number.isFinite(rawQty) && rawQty > 0 ? Math.round(rawQty * 1000) / 1000 : null;
  }

  let normalized = rawQty.trim().toLowerCase();
  if (!normalized) return null;

  for (const [glyph, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    normalized = normalized.replace(new RegExp(glyph, 'g'), ` ${ascii}`);
  }
  normalized = normalized.replace(/\s+/g, ' ').trim();

  if (WORD_NUMBERS[normalized] !== undefined) {
    return WORD_NUMBERS[normalized];
  }

  // Handle ranges like "2-3" or "2 to 3" -> midpoint or lower bound (use midpoint rounded cleanly)
  const rangeMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return Math.round(((low + high) / 2) * 100) / 100;
    }
  }

  // Mixed number e.g. "1 1/2"
  const mixedMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den !== 0) {
      return Math.round((whole + num / den) * 1000) / 1000;
    }
  }

  // Simple fraction e.g. "1/2"
  const fracMatch = normalized.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den !== 0) {
      return Math.round((num / den) * 1000) / 1000;
    }
  }

  const numValue = Number(normalized);
  if (Number.isFinite(numValue) && numValue > 0) {
    return Math.round(numValue * 1000) / 1000;
  }

  return null;
}

export function normalizeIngredientName(
  rawName: string,
  detectedUnit?: StandardizedUnit
): { ingredient: string; notes?: string } {
  let text = rawName.trim().replace(/\s+/g, ' ');
  let notes: string | undefined;

  // Extract trailing parenthetical notes e.g. "flour (sifted)"
  const parenMatch = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch && parenMatch[1].trim().length > 0) {
    text = parenMatch[1].trim();
    notes = parenMatch[2].trim();
  }

  // Extract comma prep notes e.g. "unsalted butter, softened"
  const commaIndex = text.indexOf(',');
  if (commaIndex > 0) {
    const base = text.slice(0, commaIndex).trim();
    const trailing = text.slice(commaIndex + 1).trim();
    if (base.length > 1 && trailing.length > 0) {
      text = base;
      notes = notes ? `${trailing}; ${notes}` : trailing;
    }
  }

  // Strip leading "of " or "a " / "an "
  text = text.replace(/^(?:of|the)\s+/i, '').trim().toLowerCase();

  // If unit is 'clove' and ingredient is 'garlic cloves' or 'cloves of garlic'
  if (detectedUnit === 'clove') {
    text = text.replace(/\bcloves?\b/g, '').replace(/^of\s+/, '').trim();
  }

  // Normalize known synonyms
  if (INGREDIENT_SYNONYMS[text]) {
    text = INGREDIENT_SYNONYMS[text];
  }

  return {
    ingredient: text || rawName.trim().toLowerCase(),
    ...(notes ? { notes } : {}),
  };
}

const KNOWN_UNIT_PATTERN =
  'fl\\.?\\s*oz\\.?|fluid\\s+ounces?|tablespoons?|tbsp\\.?|tbs\\.?|teaspoons?|tsp\\.?|kilograms?|kgs?|grams?|gms?|gm|g\\.?|milliliters?|millilitres?|mls?|liters?|litres?|l|ounces?|oz\\.?|pounds?|lbs?|lb\\.?|cups?|c\\.?|cloves?|pinches?|dashes?|slices?|pieces?|pcs?|bunches?|sprigs?|cans?|tins?|sticks?|handfuls?';

export function parseIngredientPhrase(phrase: string): StandardizedIngredient {
  const raw = phrase.trim();
  if (!raw) {
    return { ingredient: '', quantity: null, unit: 'unit', raw };
  }

  let working = raw;
  for (const [glyph, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    working = working.replace(new RegExp(glyph, 'g'), ` ${ascii}`);
  }
  working = working.replace(/\s+/g, ' ').trim();

  // Check "to taste" / "as needed" suffix
  if (/\b(to taste|as needed)\b/i.test(working)) {
    const cleanedName = working.replace(/,?\s*\b(to taste|as needed)\b/i, '').trim();
    const normalized = normalizeIngredientName(cleanedName);
    return {
      ingredient: normalized.ingredient,
      quantity: null,
      unit: 'to taste',
      ...(normalized.notes ? { notes: normalized.notes } : {}),
      raw,
    };
  }

  // Match quantity + optional unit + ingredient name
  // Example: "1 cup of flour", "250g butter", "1 1/2 tbsp soy sauce", "2-3 cloves garlic"
  const qtyRegex = new RegExp(
    `^((?:\\d+\\s+\\d+/\\d+)|(?:\\d+/\\d+)|(?:\\d+(?:\\.\\d+)?(?:\\s*(?:-|to|–)\\s*\\d+(?:\\.\\d+)?)?)|(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|half))\\s*(${KNOWN_UNIT_PATTERN})?\\b\\s*(?:of\\s+)?(.+)$`,
    'i'
  );

  const match = working.match(qtyRegex);
  if (match) {
    const quantity = parseQuantity(match[1]);
    const unit = normalizeUnit(match[2]);
    const { ingredient, notes } = normalizeIngredientName(match[3], unit);
    return {
      ingredient,
      quantity,
      unit,
      ...(notes ? { notes } : {}),
      raw,
    };
  }

  // Fallback: no numeric quantity detected
  const normalized = normalizeIngredientName(working);
  return {
    ingredient: normalized.ingredient,
    quantity: null,
    unit: 'unit',
    ...(normalized.notes ? { notes: normalized.notes } : {}),
    raw,
  };
}

export type RawIngredientInput =
  | string
  | {
      ingredient?: string;
      quantity?: number | string | null;
      unit?: string | null;
      notes?: string;
      raw?: string;
    };

export function standardizeIngredients(
  items: RawIngredientInput[]
): StandardizedIngredient[] {
  return items
    .map((item): StandardizedIngredient | null => {
      if (typeof item === 'string') {
        const parsed = parseIngredientPhrase(item);
        return parsed.ingredient ? parsed : null;
      }

      const rawName = (item.ingredient ?? item.raw ?? '').trim();
      if (!rawName) return null;

      // If raw was provided without explicit quantity/unit, parse raw
      if (item.raw && item.quantity === undefined && !item.unit) {
        return parseIngredientPhrase(item.raw);
      }

      const unit = normalizeUnit(item.unit);
      const quantity = parseQuantity(item.quantity ?? null);
      const { ingredient, notes } = normalizeIngredientName(rawName, unit);

      return {
        ingredient,
        quantity,
        unit,
        ...(item.notes || notes ? { notes: item.notes ?? notes } : {}),
        ...(item.raw ? { raw: item.raw } : {}),
      };
    })
    .filter((entry): entry is StandardizedIngredient => entry !== null);
}

const DISPLAY_FRACTIONS: Array<[number, string]> = [
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.5, '½'],
  [0.667, '⅔'],
  [0.75, '¾'],
];

export function formatQuantity(qty: number | null): string {
  if (qty === null || qty === undefined) return '';
  const whole = Math.floor(qty);
  const remainder = Math.round((qty - whole) * 1000) / 1000;

  if (remainder < 0.01) {
    return String(whole);
  }

  for (const [val, glyph] of DISPLAY_FRACTIONS) {
    if (Math.abs(remainder - val) < 0.04) {
      return whole > 0 ? `${whole} ${glyph}` : glyph;
    }
  }

  return String(Math.round(qty * 100) / 100);
}

export function formatIngredientDisplay(item: StandardizedIngredient): string {
  if (item.unit === 'to taste') {
    return `${item.ingredient}, to taste${item.notes ? ` (${item.notes})` : ''}`;
  }
  const qtyText = formatQuantity(item.quantity);
  const unitText = item.unit === 'unit' ? '' : item.unit;
  const prefix = [qtyText, unitText].filter(Boolean).join(' ');
  const base = prefix ? `${prefix} ${item.ingredient}` : item.ingredient;
  return item.notes ? `${base}, ${item.notes}` : base;
}
