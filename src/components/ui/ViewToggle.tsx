export type ViewMode = 'cards' | 'list';

interface Props {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex bg-surface-raised rounded-lg p-1 gap-1" role="group" aria-label="View mode">
      <button
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
        className={`p-1.5 rounded-md transition-all ${
          value === 'cards'
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
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
        className={`p-1.5 rounded-md transition-all ${
          value === 'list'
            ? 'bg-accent text-white shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
        title="List view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}
