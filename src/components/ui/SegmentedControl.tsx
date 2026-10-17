import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { m } from 'motion/react';
import { spring } from '../../design/motion';

interface Props {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** Stretch to the container width with equal segments. */
  fill?: boolean;
  size?: 'sm' | 'md';
}

export default function SegmentedControl({ options, value, onChange, ariaLabel = 'View', fill = false, size = 'md' }: Props) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const layoutId = `segment-thumb-${useId()}`;

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
    <div
      className={`segmented ${fill ? 'flex w-full' : 'inline-flex'} max-w-full overflow-x-auto scrollbar-none`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt, index) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`segmented-item hit-44 ${fill ? 'flex-1' : ''} ${size === 'sm' ? 'min-h-7 px-3 text-[0.75rem]' : 'min-h-8 px-3.5 text-[0.8125rem]'} ${
              selected ? 'text-on-accent' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {selected && (
              <m.span
                layoutId={layoutId}
                className="segmented-thumb"
                transition={spring.default}
                aria-hidden="true"
              />
            )}
            <span className="relative z-[1] whitespace-nowrap">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
