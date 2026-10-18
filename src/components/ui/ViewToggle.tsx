import type { CoverSize } from '../../hooks/useSettings';
import SegmentedControl from './SegmentedControl';

export type ViewMode = 'cards' | 'list';

const COVER_SIZES: { value: CoverSize; label: string }[] = [
  { value: 'xs', label: 'XS' },
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

interface Props {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  coverSize?: CoverSize;
  onCoverSizeChange?: (size: CoverSize) => void;
}

function IconButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`press hit-44 grid h-8 w-9 place-items-center rounded-lg transition-colors ${
        active ? 'bg-accent text-on-accent shadow-chip' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export default function ViewToggle({ value, onChange, coverSize, onCoverSizeChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="segmented inline-flex" role="group" aria-label="View mode">
        <IconButton active={value === 'cards'} label="Card view" onClick={() => onChange('cards')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
        </IconButton>
        <IconButton active={value === 'list'} label="List view" onClick={() => onChange('list')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 6h13M8 12h13M8 18h13" />
            <circle cx="3.5" cy="6" r="1" fill="currentColor" />
            <circle cx="3.5" cy="12" r="1" fill="currentColor" />
            <circle cx="3.5" cy="18" r="1" fill="currentColor" />
          </svg>
        </IconButton>
      </div>

      {value === 'cards' && coverSize && onCoverSizeChange && (
        <SegmentedControl
          options={COVER_SIZES}
          value={coverSize}
          onChange={(size) => onCoverSizeChange(size as CoverSize)}
          ariaLabel="Cover size"
          size="sm"
        />
      )}
    </div>
  );
}
