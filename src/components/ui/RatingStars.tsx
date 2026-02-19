import { useState } from 'react';

interface Props {
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

export default function RatingStars({ value, onChange, readonly = false, size = 'md' }: Props) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value || 0;
  const starSize = size === 'sm' ? 'text-sm' : 'text-lg';

  return (
    <div className="inline-flex gap-0.5" role="group" aria-label="Rating">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className={`${starSize} transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${star <= displayValue ? 'text-yellow-400' : 'text-text-muted/30'}`}
          aria-label={`${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
