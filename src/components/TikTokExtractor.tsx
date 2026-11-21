import { useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import { ChevronDown, ChevronUp, Film, Link2, Loader2, Upload } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { validateTikTokUrl } from '../utils/recipeMetrics';

interface TikTokExtractorProps {
  inputRef: RefObject<HTMLInputElement | null>;
  existingCategories: string[];
  onExtract: (payload: {
    tiktokUrl: string;
    customName?: string;
    categoryHint?: string;
    userNotes?: string;
    uploadedVideo?: { base64: string; mimeType: string; fileName: string };
  }) => Promise<void>;
  isExtracting: boolean;
  serverError: string | null;
  onClearError: () => void;
}

export function TikTokExtractor({
  inputRef,
  existingCategories,
  onExtract,
  isExtracting,
  serverError,
  onClearError,
}: TikTokExtractorProps) {
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [categoryHint, setCategoryHint] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<{
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories]));

  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploadedVideo(null);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setValidationError('Video clip must be 20 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : '';
      if (base64) {
        setUploadedVideo({
          base64,
          mimeType: file.type || 'video/mp4',
          fileName: file.name,
        });
        setValidationError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    onClearError();

    const check = validateTikTokUrl(tiktokUrl);
    if (!check.valid || !check.normalizedUrl) {
      setValidationError(check.error || 'Please enter a valid TikTok URL.');
      return;
    }

    setValidationError(null);
    const chosenCategory =
      categoryHint === '__custom__' ? customCategory.trim() : categoryHint.trim();

    await onExtract({
      tiktokUrl: check.normalizedUrl,
      customName: customName.trim() || undefined,
      categoryHint: chosenCategory || undefined,
      userNotes: userNotes.trim() || undefined,
      uploadedVideo: uploadedVideo ?? undefined,
    });

    setTiktokUrl('');
    setCustomName('');
    setCategoryHint('');
    setCustomCategory('');
    setUserNotes('');
    setUploadedVideo(null);
  };

  const displayedError = validationError || serverError;

  return (
    <section
      id="extractor"
      className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/90 dark:border-stone-800 rounded-2xl p-6 sm:p-8 shadow-sm"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-medium tracking-wide text-emerald-800 dark:text-emerald-400 mb-2">
          TikTok Video to Kitchen Archive
        </p>
        <h1
          className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-tight mb-3"
          style={{ textWrap: 'balance' }}
        >
          Turn TikTok cooking clips into standardized recipes
        </h1>
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed mb-6">
          Paste a TikTok video link to analyze visual and audio cooking cues, standardize ingredient
          measurements, and organize every dish by name, category, and rating.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="tiktok-url-input" className="sr-only">
              TikTok Video Link
            </label>
            <div className="relative flex items-center">
              <Link2
                className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id="tiktok-url-input"
                type="url"
                value={tiktokUrl}
                onChange={(e) => {
                  setTiktokUrl(e.target.value);
                  if (validationError) setValidationError(null);
                  if (serverError) onClearError();
                }}
                placeholder="https://www.tiktok.com/@creator/video/..."
                aria-describedby={displayedError ? 'extractor-error' : undefined}
                disabled={isExtracting}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isExtracting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Extracting Recipe...
              </>
            ) : (
              'Extract Recipe'
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowOptions((prev) => !prev)}
            aria-expanded={showOptions}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {showOptions ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Name, category, caption notes, or video clip upload
          </button>

          {uploadedVideo && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400">
              <Film className="w-3.5 h-3.5" aria-hidden="true" />
              Clip attached: {uploadedVideo.fileName}
            </span>
          )}
        </div>

        {showOptions && (
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="custom-recipe-name"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5"
              >
                Custom Recipe Name (optional)
              </label>
              <input
                id="custom-recipe-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Weeknight Garlic Chili Noodles"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="category-hint-select"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5"
              >
                Category (optional)
              </label>
              <select
                id="category-hint-select"
                value={categoryHint}
                onChange={(e) => setCategoryHint(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Auto-detect category</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">Create custom category...</option>
              </select>

              {categoryHint === '__custom__' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter new category name"
                  aria-label="Custom category name"
                  className="mt-2 w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="video-notes-textarea"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5"
              >
                Video Caption or Spoken Ingredients Notes (optional)
              </label>
              <textarea
                id="video-notes-textarea"
                rows={2}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Paste the TikTok caption, ingredient list, or audio transcript if the video has region restrictions..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="video-clip-upload"
                className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5"
              >
                Attach Downloaded TikTok Clip for Direct Visual & Audio Analysis (optional, max 20 MB)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="video-clip-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  {uploadedVideo ? 'Replace Video Clip' : 'Choose Video File (.mp4 / .mov / .webm)'}
                </label>
                <input
                  id="video-clip-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="sr-only"
                />
                {uploadedVideo && (
                  <button
                    type="button"
                    onClick={() => setUploadedVideo(null)}
                    className="text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 underline cursor-pointer"
                  >
                    Remove clip
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {displayedError && (
          <div
            id="extractor-error"
            role="alert"
            className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs sm:text-sm text-red-800 dark:text-red-300"
          >
            {displayedError}
          </div>
        )}
      </form>
    </section>
  );
}
