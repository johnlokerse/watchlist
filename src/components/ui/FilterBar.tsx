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
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            selected.includes(f.value)
              ? 'bg-accent/15 text-accent border-accent/40'
              : 'bg-surface-raised text-text-secondary border-border-subtle hover:border-text-muted'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
