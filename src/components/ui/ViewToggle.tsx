import type { CoverSize } from '../../hooks/useSettings';

export type ViewMode = 'cards' | 'list';

const COVER_SIZES: [CoverSize, string][] = [
  ['small', 'S'],
  ['medium', 'M'],
  ['large', 'L'],
];

interface Props {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  coverSize?: CoverSize;
  onCoverSizeChange?: (size: CoverSize) => void;
}

export default function ViewToggle({ value, onChange, coverSize, onCoverSizeChange }: Props) {
  const btnClass = (active: boolean) =>
    `p-1.5 rounded-md transition-all ${
      active ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
    }`;

  return (
    <div className="inline-flex items-center bg-surface-raised rounded-lg p-1 gap-1" role="group" aria-label="View mode">
      <button
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
        className={btnClass(value === 'cards')}
        title="Card view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      <button
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={btnClass(value === 'list')}
        title="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {value === 'cards' && coverSize && onCoverSizeChange && (
        <>
          <div className="w-px h-4 bg-border-subtle mx-0.5" />
          {COVER_SIZES.map(([size, label]) => (
            <button
              key={size}
              aria-pressed={coverSize === size}
              onClick={() => onCoverSizeChange(size)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                coverSize === size
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
