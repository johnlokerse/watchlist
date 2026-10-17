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
      {filters.map((f) => {
        const isOn = selected.includes(f.value);
        return (
          <button
            key={f.value}
            type="button"
            aria-pressed={isOn}
            onClick={() => toggle(f.value)}
            className={`press inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors ${
              isOn
                ? 'bg-accent text-on-accent'
                : 'bg-fill text-text-secondary hover:bg-fill-strong hover:text-text-primary'
            }`}
          >
            {isOn && (
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12 5 5 9-10" />
              </svg>
            )}
            {f.icon && (
              <img src={f.icon} alt="" className="h-4 w-4 shrink-0 rounded object-cover" loading="lazy" />
            )}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
