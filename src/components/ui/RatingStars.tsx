import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { m } from 'motion/react';
import { appleSpring } from '../../design/motion';
import { formatStars } from '../../utils/rating';

interface Props {
  /** Stored on a 1–10 scale: one point per half star. */
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}

const STAR_PATH = 'M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z';
const pop = appleSpring(0.32, 0.55);

function Star({ fill, px }: { fill: number; px: number }) {
  return (
    <span className="relative block" style={{ width: px, height: px }}>
      <svg className="absolute inset-0 text-fill-strong" width={px} height={px} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={STAR_PATH} />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg className="text-warning" width={px} height={px} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

/**
 * Five stars with half steps. Drag across the stars to scrub a rating (pointer capture keeps
 * tracking when the finger leaves the row); keyboard users move with the arrow keys.
 */
export default function RatingStars({ value, onChange, readonly = false, size = 'md' }: Props) {
  const px = size === 'sm' ? 24 : 28;
  const rowRef = useRef<HTMLDivElement>(null);
  const radiosRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [popKey, setPopKey] = useState(0);
  const draggingRef = useRef(false);
  const shown = preview ?? value ?? 0;

  if (readonly) {
    return (
      <span className="inline-flex gap-0.5" role="img" aria-label={value ? `${formatStars(value)} out of 5` : 'Not rated'}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} px={px} fill={Math.max(0, Math.min(1, ((value ?? 0) - i * 2) / 2))} />
        ))}
      </span>
    );
  }

  const valueAt = (clientX: number) => {
    const rect = rowRef.current!.getBoundingClientRect();
    return Math.max(1, Math.min(10, Math.ceil(((clientX - rect.left) / rect.width) * 10)));
  };

  const commit = (next: number) => {
    setPopKey((k) => k + 1);
    onChange?.(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreview(valueAt(event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      setPreview(valueAt(event.clientX));
    } else if (event.pointerType === 'mouse') {
      setPreview(valueAt(event.clientX));
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const next = valueAt(event.clientX);
    setPreview(null);
    commit(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = value ?? 0;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(10, current + 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(1, current - 1);
    if (event.key === 'Home') next = 1;
    if (event.key === 'End') next = 10;
    if (next == null) return;
    event.preventDefault();
    commit(next);
    radiosRef.current[next - 1]?.focus();
  };

  const focusIndex = value ? value - 1 : 0;
  const poppedStar = value ? Math.ceil(value / 2) - 1 : -1;

  return (
    <div
      ref={rowRef}
      role="radiogroup"
      aria-label="Rating"
      className="relative inline-flex cursor-pointer touch-none select-none gap-0.5 py-2"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { draggingRef.current = false; setPreview(null); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse' && !draggingRef.current) setPreview(null); }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <m.span
          key={i === poppedStar ? `pop-${popKey}` : i}
          initial={i === poppedStar && popKey > 0 ? { scale: 0.8 } : false}
          animate={{ scale: 1 }}
          transition={pop}
          className="relative block"
        >
          <Star px={px} fill={Math.max(0, Math.min(1, (shown - i * 2) / 2))} />
          {[1, 2].map((half) => {
            const n = i * 2 + half;
            return (
              <button
                key={n}
                ref={(el) => {
                  radiosRef.current[n - 1] = el;
                }}
                type="button"
                role="radio"
                aria-checked={value === n}
                aria-label={formatStars(n)}
                tabIndex={n - 1 === focusIndex ? 0 : -1}
                onKeyDown={handleKeyDown}
                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                  // Pointer input is handled by the row (drag-to-rate); this covers keyboard activation.
                  if (event.detail === 0) commit(n);
                }}
                className={`absolute inset-y-[-8px] ${half === 1 ? 'left-0 right-1/2' : 'left-1/2 right-0'} rounded-sm`}
              />
            );
          })}
        </m.span>
      ))}
    </div>
  );
}
