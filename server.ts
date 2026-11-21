import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  addRecipeReview,
  createRecipe,
  deleteRecipe,
  listRecipes,
  updateRecipe,
} from './src/server/recipeStore';
import { resolveTikTokVideo } from './src/server/tiktokResolver';
import { extractRecipeWithGemini } from './src/server/geminiExtractor';
import { validateTikTokUrl } from './src/utils/recipeMetrics';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '35mb' }));

  app.get('/api/recipes', (_req, res) => {
    try {
      const recipes = listRecipes();
      res.json({ recipes });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load recipes.',
      });
    }
  });

  app.post('/api/recipes/extract', async (req, res) => {
    try {
      const {
        tiktokUrl,
        customName,
        categoryHint,
        userNotes,
        uploadedVideo,
      } = req.body as {
        tiktokUrl?: string;
        customName?: string;
        categoryHint?: string;
        userNotes?: string;
        uploadedVideo?: { base64?: string; mimeType?: string };
      };

      const validation = validateTikTokUrl(tiktokUrl ?? '');
      if (!validation.valid || !validation.normalizedUrl) {
        res.status(400).json({ error: validation.error || 'Invalid TikTok URL.' });
        return;
      }

      const signals = await resolveTikTokVideo(validation.normalizedUrl);

      const recipe = await extractRecipeWithGemini({
        tiktokUrl: validation.normalizedUrl,
        customName,
        categoryHint,
        userNotes,
        uploadedVideo:
          uploadedVideo?.base64 && uploadedVideo?.mimeType
            ? { base64: uploadedVideo.base64, mimeType: uploadedVideo.mimeType }
            : undefined,
        signals,
      });

      const saved = createRecipe(recipe);
      res.status(201).json({ recipe: saved });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recipe extraction failed.';
      if (message.startsWith('UNREACHABLE_TIKTOK:')) {
        res.status(422).json({ error: message.replace('UNREACHABLE_TIKTOK:', '').trim() });
        return;
      }
      if (message.includes('GEMINI_API_KEY')) {
        res.status(500).json({
          error: 'Server Gemini API key is not configured. Check Settings > Secrets.',
        });
        return;
      }
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/recipes/:id', (req, res) => {
    const updated = updateRecipe(req.params.id, req.body || {});
    if (!updated) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }
    res.json({ recipe: updated });
  });

  app.delete('/api/recipes/:id', (req, res) => {
    const ok = deleteRecipe(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  app.post('/api/recipes/:id/reviews', (req, res) => {
    const { authorName, rating, comment } = req.body as {
      authorName?: string;
      rating?: number;
      comment?: string;
    };

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
      return;
    }

    if (!comment || !comment.trim()) {
      res.status(400).json({ error: 'Please write a short review before submitting.' });
      return;
    }

    const updated = addRecipeReview(req.params.id, {
      authorName: authorName || 'Home Cook',
      rating: numericRating,
      comment,
    });

    if (!updated) {
      res.status(404).json({ error: 'Recipe not found.' });
      return;
    }

    res.status(201).json({ recipe: updated });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TableNote server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
