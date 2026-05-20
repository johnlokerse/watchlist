interface Props {
  filters: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function FilterBar({ filters, selected, onChange }: Props) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value],
    );
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => toggle(f.value)}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            selected.includes(f.value)
              ? 'border-accent/45 bg-accent/15 text-accent'
              : 'border-border-subtle bg-surface-raised text-text-secondary hover:border-text-muted hover:bg-surface-overlay'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
