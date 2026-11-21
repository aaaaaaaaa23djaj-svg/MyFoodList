import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  ExtractionSource,
  Recipe,
  RecipeStep,
  StandardizedIngredient,
} from '../types/recipe';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { standardizeIngredients } from '../utils/ingredients';
import type { ResolvedTikTokSignals } from './tiktokResolver';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const RECIPE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Clean, appetizing recipe title.',
    },
    category: {
      type: Type.STRING,
      description: `Best matching culinary category. Prefer one of: ${DEFAULT_CATEGORIES.join(', ')}`,
    },
    summary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence editorial description of the dish and flavor profile.',
    },
    prepMinutes: {
      type: Type.INTEGER,
      description: 'Estimated preparation time in minutes.',
    },
    cookMinutes: {
      type: Type.INTEGER,
      description: 'Estimated active cooking time in minutes.',
    },
    servings: {
      type: Type.INTEGER,
      description: 'Estimated number of servings.',
    },
    ingredients: {
      type: Type.ARRAY,
      description:
        'All recipe ingredients extracted and converted into standardized structured quantities and units.',
      items: {
        type: Type.OBJECT,
        properties: {
          ingredient: {
            type: Type.STRING,
            description:
              'Normalized core ingredient name in lowercase without quantity/unit or leading "of", e.g. "flour", "unsalted butter", "garlic".',
          },
          quantity: {
            type: Type.NUMBER,
            description:
              'Numeric decimal quantity (e.g. 1, 0.5, 250). Omit or use 0 if "to taste".',
          },
          unit: {
            type: Type.STRING,
            description:
              'Standardized unit: one of cup, tbsp, tsp, g, kg, ml, l, oz, fl oz, lb, clove, pinch, slice, piece, bunch, sprig, can, stick, handful, to taste, unit.',
          },
          notes: {
            type: Type.STRING,
            description: 'Optional prep state like "finely chopped", "softened", "sifted".',
          },
        },
        required: ['ingredient', 'unit'],
      },
    },
    steps: {
      type: Type.ARRAY,
      description:
        'Sequential numbered cooking steps inferred from visual cues, spoken/audio cues, and video captions.',
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: {
            type: Type.INTEGER,
            description: '1-based sequential step index.',
          },
          instruction: {
            type: Type.STRING,
            description: 'Clear imperative cooking step.',
          },
          cueSource: {
            type: Type.STRING,
            description: 'Primary cue source: visual, audio, caption, or inferred.',
          },
          timestampHint: {
            type: Type.STRING,
            description: 'Optional video timestamp like "0:14" when observable.',
          },
          durationMinutes: {
            type: Type.INTEGER,
            description: 'Optional duration for this step in minutes.',
          },
        },
        required: ['stepNumber', 'instruction', 'cueSource'],
      },
    },
  },
  required: ['title', 'category', 'summary', 'prepMinutes', 'cookMinutes', 'servings', 'ingredients', 'steps'],
};

export interface ExtractRecipeParams {
  tiktokUrl: string;
  customName?: string;
  categoryHint?: string;
  userNotes?: string;
  uploadedVideo?: {
    base64: string;
    mimeType: string;
  };
  signals: ResolvedTikTokSignals;
}

interface GeminiRecipePayload {
  title: string;
  category: string;
  summary: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: Array<{
    ingredient: string;
    quantity?: number | null;
    unit: string;
    notes?: string | null;
  }>;
  steps: Array<{
    stepNumber: number;
    instruction: string;
    cueSource: string;
    timestampHint?: string | null;
    durationMinutes?: number | null;
  }>;
}

export async function extractRecipeWithGemini(params: ExtractRecipeParams): Promise<Recipe> {
  const ai = getGeminiClient();
  const { tiktokUrl, customName, categoryHint, userNotes, uploadedVideo, signals } = params;

  const hasVideoBinary = Boolean(uploadedVideo?.base64 || signals.videoBase64);
  const videoBase64 = uploadedVideo?.base64 || signals.videoBase64;
  const videoMimeType = uploadedVideo?.mimeType || signals.videoMimeType || 'video/mp4';

  const contextParts: string[] = [
    `TikTok Video URL: ${signals.resolvedUrl || tiktokUrl}`,
    `Creator Handle: ${signals.creatorHandle || '@tiktokchef'}`,
  ];
  if (signals.oembedTitle) contextParts.push(`TikTok oEmbed Title: ${signals.oembedTitle}`);
  if (signals.description) contextParts.push(`Video Caption / Description:\n${signals.description}`);
  if (signals.subtitlesText) contextParts.push(`Video Spoken Subtitles:\n${signals.subtitlesText}`);
  if (userNotes?.trim()) contextParts.push(`User Supplied Video Notes / Transcript:\n${userNotes.trim()}`);
  if (customName?.trim()) contextParts.push(`User Preferred Recipe Name: ${customName.trim()}`);
  if (categoryHint?.trim()) contextParts.push(`Preferred Category: ${categoryHint.trim()}`);

  const systemInstruction = `You are a culinary recipe extraction specialist. Convert TikTok cooking videos into accurate, standardized recipes.

Rules:
1. Analyze BOTH visual cues (ingredients shown, measurements/ratios, pan temperatures, texture/color changes, assembly) AND audio cues (spoken ingredients, amounts, verbal tips, timers, sizzling/simmering) whenever video/subtitles or video notes are provided.
2. Convert every ingredient into standardized structured units: cup, tbsp, tsp, g, kg, ml, l, oz, fl oz, lb, clove, pinch, slice, piece, bunch, sprig, can, stick, handful, to taste, or unit. For example, "1 cup of flour" MUST become { ingredient: "flour", quantity: 1, unit: "cup" }.
3. Strip articles and "of" from ingredient names and place preparation details (e.g., "finely chopped", "softened") into notes.
4. Output clear, numbered cooking steps with accurate cueSource ('visual' | 'audio' | 'caption' | 'inferred') and timestampHint when observable.
5. Stick strictly to the dish shown or described in the TikTok link and notes.`;

  let groundedSummary = '';
  let extractionSource: ExtractionSource = 'tiktok-metadata';

  if (hasVideoBinary && videoBase64) {
    extractionSource = 'video-multimodal';
  } else if (userNotes?.trim()) {
    extractionSource = 'user-assisted';
  } else if (!signals.hasRichMetadata) {
    // Only invoke Google Search grounding when TikTok did not return direct video/metadata and no user notes were provided
    try {
      const groundingRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Find the exact dish, ingredients with measurements, and cooking steps for this TikTok video: ${signals.resolvedUrl || tiktokUrl}. Only report verified facts found for this video.`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      if (groundingRes.text?.trim()) {
        groundedSummary = groundingRes.text.trim();
      }
    } catch {
      // Grounding optional
    }

    if (!groundedSummary) {
      throw new Error(
        'UNREACHABLE_TIKTOK: Unable to retrieve the video stream or caption from this TikTok URL (it may be private or protected by TikTok). Upload the downloaded clip or paste the video caption/notes below to extract the recipe.'
      );
    }
  }

  const promptText = [
    'Extract the complete recipe from the provided TikTok cooking video and metadata.',
    ...contextParts,
    ...(groundedSummary ? [`Grounded Web Research:\n${groundedSummary}`] : []),
  ].join('\n\n');

  const contents =
    hasVideoBinary && videoBase64
      ? {
          parts: [
            {
              inlineData: {
                mimeType: videoMimeType,
                data: videoBase64,
              },
            },
            { text: promptText },
          ],
        }
      : promptText;

  const jsonContract = `Return ONLY valid JSON matching this exact TypeScript shape:
{
  "title": string,
  "category": string (prefer one of: ${DEFAULT_CATEGORIES.join(', ')}),
  "summary": string,
  "prepMinutes": number,
  "cookMinutes": number,
  "servings": number,
  "ingredients": [{ "ingredient": string, "quantity": number | null, "unit": "cup"|"tbsp"|"tsp"|"g"|"kg"|"ml"|"l"|"oz"|"fl oz"|"lb"|"clove"|"pinch"|"slice"|"piece"|"bunch"|"sprig"|"can"|"stick"|"handful"|"to taste"|"unit", "notes"?: string }],
  "steps": [{ "stepNumber": number, "instruction": string, "cueSource": "visual"|"audio"|"caption"|"inferred", "timestampHint"?: string, "durationMinutes"?: number }]
}`;

  const attempts: Array<{ model: string; thinkingConfig?: { thinkingLevel: ThinkingLevel } }> = [
    { model: 'gemini-4-hydrogen', thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    { model: 'gemini-3.1-flash-lite' },
  ];

  let rawJson = '';
  let lastErrorMessage = 'Recipe extraction service is temporarily unavailable.';

  for (const attempt of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    let collected = '';
    try {
      const stream = await ai.models.generateContentStream({
        model: attempt.model,
        contents,
        config: {
          abortSignal: controller.signal,
          systemInstruction: `${systemInstruction}\n\n${jsonContract}`,
          responseMimeType: 'application/json',
          ...(attempt.thinkingConfig ? { thinkingConfig: attempt.thinkingConfig } : {}),
        },
      });
      for await (const chunk of stream) {
        if (chunk.text) {
          collected += chunk.text;
        }
      }
      if (collected.trim()) {
        rawJson = collected.trim();
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastErrorMessage = msg;
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('aborted');
      if (!isTransient) {
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (!rawJson) {
    if (lastErrorMessage.includes('PERMISSION_DENIED') || lastErrorMessage.includes('API_KEY_INVALID')) {
      throw new Error('Gemini API key is invalid or missing permissions. Check Settings > Secrets.');
    }
    if (lastErrorMessage.includes('503') || lastErrorMessage.includes('UNAVAILABLE')) {
      throw new Error('Gemini is experiencing temporary high demand. Please retry in a moment.');
    }
    throw new Error('Unable to extract structured recipe from this video right now.');
  }

  const parsed = JSON.parse(rawJson) as GeminiRecipePayload;

  const standardizedIngredients: StandardizedIngredient[] = standardizeIngredients(
    (parsed.ingredients || []).map((item) => ({
      ingredient: item.ingredient,
      quantity: item.quantity ?? null,
      unit: item.unit,
      notes: item.notes ?? undefined,
    }))
  );

  const normalizedSteps: RecipeStep[] = (parsed.steps || []).map((step, index) => {
    const validCue = ['visual', 'audio', 'caption', 'inferred'].includes(step.cueSource)
      ? (step.cueSource as RecipeStep['cueSource'])
      : hasVideoBinary
        ? 'visual'
        : 'caption';
    return {
      stepNumber: index + 1,
      instruction: step.instruction?.trim() || `Step ${index + 1}`,
      cueSource: validCue,
      ...(step.timestampHint ? { timestampHint: step.timestampHint } : {}),
      ...(step.durationMinutes ? { durationMinutes: Math.max(1, Math.round(step.durationMinutes)) } : {}),
    };
  });

  const now = new Date().toISOString();

  return {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: customName?.trim() || parsed.title?.trim() || 'Untitled TikTok Recipe',
    category: categoryHint?.trim() || parsed.category?.trim() || 'Quick Dinners',
    tiktokUrl: signals.resolvedUrl || tiktokUrl,
    creatorHandle: signals.creatorHandle || '@tiktokchef',
    ...(signals.thumbnailUrl ? { thumbnailUrl: signals.thumbnailUrl } : {}),
    prepMinutes: Math.max(0, Number(parsed.prepMinutes) || 10),
    cookMinutes: Math.max(0, Number(parsed.cookMinutes) || 15),
    servings: Math.max(1, Number(parsed.servings) || 2),
    summary: parsed.summary?.trim() || 'Extracted from TikTok culinary video.',
    ingredients: standardizedIngredients,
    steps: normalizedSteps,
    reviews: [],
    extractionSource,
    createdAt: now,
    updatedAt: now,
  };
}
