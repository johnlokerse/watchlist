import type { ReactNode } from 'react';
import type { CoverSize } from '../../hooks/useSettings';

interface Props {
  children: ReactNode;
  compact?: boolean;
  coverSize?: CoverSize;
}

const GRID_CLASSES: Record<CoverSize, { normal: string; compact: string }> = {
  small: {
    normal: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9 gap-3',
    compact: 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-1.5',
  },
  medium: {
    normal: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4',
    compact: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2',
  },
  large: {
    normal: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-5',
    compact: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3',
  },
};

export default function CardGrid({ children, compact, coverSize = 'medium' }: Props) {
  const classes = GRID_CLASSES[coverSize];
  return (
    <div className={compact ? classes.compact : classes.normal}>
      {children}
    </div>
  );
}
