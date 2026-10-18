interface Props {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  /** Visual weight: plain pop-up button (default) or a tinted accent button. */
  tone?: 'plain' | 'tinted';
}

/**
 * Native <select> styled as a pop-up button. Keeping it native gives the platform
 * picker on iOS (familiarity) and full keyboard/screen-reader support for free.
 */
export default function Select({ options, value, onChange, ariaLabel, className = '', tone = 'plain' }: Props) {
  return (
    <div className={`press relative inline-flex ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-9 w-full cursor-pointer appearance-none rounded-[10px] pl-3 pr-8 text-[0.875rem] font-semibold transition-colors focus-visible:outline-2 ${
          tone === 'tinted'
            ? 'bg-accent/15 text-accent hover:bg-accent/25'
            : 'bg-fill text-text-primary hover:bg-fill-strong'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${tone === 'tinted' ? 'text-accent' : 'text-text-muted'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m7 10 5-5 5 5M7 14l5 5 5-5" />
      </svg>
    </div>
  );
}
