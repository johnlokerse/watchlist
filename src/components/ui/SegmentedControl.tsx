import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface Props {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export default function SegmentedControl({ options, value, onChange, ariaLabel = 'View' }: Props) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const selectOption = (index: number) => {
    const nextIndex = (index + options.length) % options.length;
    onChange(options[nextIndex].value);
    buttonsRef.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        selectOption(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        selectOption(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        selectOption(0);
        break;
      case 'End':
        event.preventDefault();
        selectOption(options.length - 1);
        break;
    }
  };

  return (
    <div className="control-surface inline-flex gap-1 p-1" role="tablist" aria-label={ariaLabel}>
      {options.map((opt, index) => (
        <button
          key={opt.value}
          ref={(element) => {
            buttonsRef.current[index] = element;
          }}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          onClick={() => onChange(opt.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
            value === opt.value
              ? 'bg-accent text-black shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
