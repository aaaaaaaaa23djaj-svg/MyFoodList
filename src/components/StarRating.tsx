import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRatingDisplay({ rating, size = 'sm' }: StarRatingDisplayProps) {
  const iconSize = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const filled = rating >= starIndex - 0.25;
        const half = !filled && rating >= starIndex - 0.75;
        return (
          <Star
            key={starIndex}
            className={`${iconSize} ${
              filled
                ? 'fill-amber-500 text-amber-500'
                : half
                  ? 'fill-amber-500/45 text-amber-500'
                  : 'fill-transparent text-stone-300 dark:text-stone-600'
            }`}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Select star rating">
      {[1, 2, 3, 4, 5].map((starValue) => {
        const active = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            aria-label={`Rate ${starValue} out of 5 stars`}
            aria-pressed={value === starValue}
            className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                active
                  ? 'fill-amber-500 text-amber-500'
                  : 'fill-transparent text-stone-300 dark:text-stone-600 hover:text-amber-400'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
