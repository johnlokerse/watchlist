import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { m } from 'motion/react';
import { spring } from '../../design/motion';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  idPrefix?: string;
}

/** Underline tabs whose indicator glides between tabs on a critically damped spring. */
export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel, idPrefix }: TabsProps<T>) {
  const autoId = useId();
  const prefix = idPrefix ?? autoId;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [fadeRight, setFadeRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const index = tabs.findIndex((t) => t.id === value);
    buttonsRef.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tabs, value]);

  const move = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    buttonsRef.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(index - 1); }
    if (event.key === 'Home') { event.preventDefault(); move(0); }
    if (event.key === 'End') { event.preventDefault(); move(tabs.length - 1); }
  };

  return (
    <div
      ref={scrollerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`tabs-bar relative mb-5 flex gap-6 overflow-x-auto scrollbar-none ${fadeRight ? 'edge-fade-x' : ''}`}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            id={`${prefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${prefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`relative min-h-11 shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold tracking-[-0.01em] transition-colors ${
              selected ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
            {selected && (
              <m.span
                layoutId={`${prefix}-underline`}
                className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-accent"
                transition={spring.default}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  prefix: string;
  /** +1 when the newly selected tab is to the right of the previous one, -1 when to the left. */
  direction: number;
  children: ReactNode;
}

/** Cross-fades panel content with a small offset in the direction of travel. */
export function TabPanel({ id, prefix, direction, children }: TabPanelProps) {
  return (
    <m.div
      key={id}
      id={`${prefix}-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`${prefix}-tab-${id}`}
      initial={{ opacity: 0, x: 10 * direction }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ opacity: { duration: 0.18, ease: 'easeOut' }, x: spring.default }}
    >
      {children}
    </m.div>
  );
}
