import { useState } from 'react';
import { m } from 'motion/react';
import { spring } from '../../design/motion';

interface Props {
  checked: boolean;
  onChange: () => void;
  /** Accessible name. Provide this or labelledBy. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
}

/** iOS-style switch: the knob stretches while pressed and travels on a spring. */
export default function Toggle({ checked, onChange, label, labelledBy, disabled }: Props) {
  const [pressed, setPressed] = useState(false);
  const knobWidth = pressed ? 30 : 24;
  const x = checked ? 44 - 2 - knobWidth - 2 : 0;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={onChange}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={`hit-44 relative inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? 'bg-success' : 'bg-fill-strong'
      }`}
    >
      <m.span
        className="pointer-events-none block h-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25),0_0_0_0.5px_rgb(0_0_0/0.04)]"
        initial={false}
        animate={{ x, width: knobWidth }}
        transition={spring.default}
      />
    </button>
  );
}
