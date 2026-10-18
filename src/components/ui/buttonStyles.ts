export type Variant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'destructive' | 'destructive-tinted';
export type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-fill text-text-primary hover:bg-fill-strong',
  tinted: 'bg-accent/15 text-accent hover:bg-accent/25',
  plain: 'text-accent hover:bg-accent/10',
  destructive: 'bg-danger text-on-danger hover:brightness-110',
  'destructive-tinted': 'bg-danger/15 text-danger hover:bg-danger/25',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-8 px-3 text-[0.8125rem] rounded-[9px] gap-1.5',
  md: 'min-h-9 px-3.5 text-[0.875rem] rounded-[10px] gap-1.5',
  lg: 'min-h-11 px-5 text-[0.9375rem] rounded-xl gap-2',
};

export function buttonClasses(variant: Variant = 'secondary', size: Size = 'md', extra = '') {
  return `press hit-44 inline-flex shrink-0 items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

