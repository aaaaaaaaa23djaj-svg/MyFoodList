import { AESTHETIC_BACKGROUNDS } from '../config/backgrounds';
import type { AestheticBackgroundId } from '../types/recipe';

interface AtmospherePickerProps {
  selectedId: AestheticBackgroundId;
  onSelect: (id: AestheticBackgroundId) => void;
}

export function AtmospherePicker({ selectedId, onSelect }: AtmospherePickerProps) {
  return (
    <section
      id="atmosphere"
      aria-labelledby="atmosphere-heading"
      className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/90 dark:border-stone-800 rounded-2xl p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2
            id="atmosphere-heading"
            className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100"
          >
            Kitchen Atmosphere
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-300 mt-1">
            Choose an aesthetic backdrop for your recipe workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {AESTHETIC_BACKGROUNDS.map((bg) => {
          const isSelected = bg.id === selectedId;
          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => onSelect(bg.id)}
              aria-pressed={isSelected}
              className={`group text-left rounded-xl border p-3 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                isSelected
                  ? 'border-emerald-700 dark:border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-700 dark:ring-emerald-400'
                  : 'border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-950/70 hover:border-stone-300 dark:hover:border-stone-700'
              }`}
            >
              <div className="aspect-[16/9] w-full rounded-lg overflow-hidden mb-3 border border-stone-200/70 dark:border-stone-800">
                {bg.imageUrl ? (
                  <img
                    src={bg.imageUrl}
                    alt={`${bg.name} background preview`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-[#F6F5F1] flex items-center justify-center text-xs text-stone-500">
                    Warm Alabaster
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {bg.name}
                </span>
                {isSelected && (
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{bg.subtitle}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
