interface Props {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
  /** Shown after the value, e.g. "of 5". */
  suffix?: string;
}

/** iOS-style stepper: always a valid, clamped value, 44pt targets, commits per tap. */
export default function Stepper({ label, value, min, max, onChange, suffix }: Props) {
  const clamp = (n: number) => Math.max(min, max != null ? Math.min(max, n) : n);
  const button = 'press hit-44 grid h-8 w-10 place-items-center text-text-primary transition-colors hover:bg-fill-strong disabled:opacity-30';

  return (
    <div className="flex items-center gap-3">
      <span className="t-callout min-w-[3.75rem] text-text-secondary" id={`stepper-${label}`}>{label}</span>
      <span className="t-callout num min-w-[3.25rem] font-semibold text-text-primary" aria-live="polite">
        {value}{suffix ? <span className="font-normal text-text-muted"> {suffix}</span> : null}
      </span>
      <div className="flex overflow-hidden rounded-[9px] bg-fill" role="group" aria-labelledby={`stepper-${label}`}>
        <button
          type="button"
          className={button}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span className="my-1.5 w-px bg-hairline" aria-hidden="true" />
        <button
          type="button"
          className={button}
          onClick={() => onChange(clamp(value + 1))}
          disabled={max != null && value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
