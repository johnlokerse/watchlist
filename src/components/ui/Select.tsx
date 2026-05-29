interface Props {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export default function Select({ options, value, onChange, ariaLabel, className = '' }: Props) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[34px] w-full appearance-none rounded-md border border-border-subtle bg-surface-raised pl-3 pr-8 text-xs font-semibold text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-overlay focus:border-accent/45 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
