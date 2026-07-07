interface Props {
  filters: { label: string; value: string; icon?: string | null }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  ariaLabel?: string;
}

export default function FilterBar({ filters, selected, onChange, ariaLabel = 'Filters' }: Props) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => toggle(f.value)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            selected.includes(f.value)
              ? 'border-accent/45 bg-accent/15 text-accent'
              : 'border-border-subtle bg-surface-raised text-text-secondary hover:border-text-muted hover:bg-surface-overlay'
          }`}
        >
          {f.icon && (
            <img src={f.icon} alt="" className="h-4 w-4 shrink-0 rounded-sm object-cover" loading="lazy" />
          )}
          {f.label}
        </button>
      ))}
    </div>
  );
}
