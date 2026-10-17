import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { spring } from '../../design/motion';

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  selected?: boolean;
  destructive?: boolean;
  /** Visually separate this item from the one above. */
  separated?: boolean;
}

interface TriggerProps {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls': string;
}

interface Props {
  label: string;
  items: MenuItem[];
  trigger: (props: TriggerProps) => ReactNode;
  align?: 'start' | 'end';
  /** Items act as a single choice (status pickers). */
  selectable?: boolean;
}

/** Popover menu that scales out of its trigger and folds back into it. */
export default function Menu({ label, items, trigger, align = 'start', selectable = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const selectedIndex = Math.max(0, items.findIndex((item) => item.selected));
    requestAnimationFrame(() => itemsRef.current[selectedIndex]?.focus());
    const handlePointer = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open, items]);

  const focusItem = (index: number) => {
    const next = (index + items.length) % items.length;
    itemsRef.current[next]?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = itemsRef.current.findIndex((el) => el === document.activeElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); focusItem(current + 1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); focusItem(current - 1); }
    if (event.key === 'Home') { event.preventDefault(); focusItem(0); }
    if (event.key === 'End') { event.preventDefault(); focusItem(items.length - 1); }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') close(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((value) => !value),
        onKeyDown: (event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': menuId,
      })}
      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={handleMenuKeyDown}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ ...spring.snappy, opacity: { duration: 0.12 } }}
            style={{ transformOrigin: align === 'start' ? 'top left' : 'top right' }}
            className={`material-sheet shadow-sheet absolute top-full z-50 mt-2 min-w-[13rem] rounded-[14px] !bg-surface-overlay p-1.5 ${align === 'start' ? 'left-0' : 'right-0'}`}
          >
            {items.map((item, index) => (
              <div key={item.id}>
                {item.separated && <div className="mx-2 my-1 h-px bg-hairline" role="separator" />}
                <button
                  ref={(el) => {
                    itemsRef.current[index] = el;
                  }}
                  type="button"
                  role={selectable ? 'menuitemradio' : 'menuitem'}
                  aria-checked={selectable ? Boolean(item.selected) : undefined}
                  tabIndex={-1}
                  onClick={() => {
                    item.onSelect();
                    close();
                  }}
                  className={`flex min-h-11 w-full items-center justify-between gap-6 rounded-[10px] px-3 text-left text-[0.9375rem] outline-none transition-colors hover:bg-fill focus-visible:bg-fill ${
                    item.destructive ? 'text-danger' : 'text-text-primary'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.selected && (
                    <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
