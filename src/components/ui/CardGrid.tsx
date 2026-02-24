import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  compact?: boolean;
}

export default function CardGrid({ children, compact }: Props) {
  return (
    <div className={
      compact
        ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2'
        : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
    }>
      {children}
    </div>
  );
}
