import { useCountdown } from '../../hooks/useCountdown';
import { formatCountdown } from '../../utils/date';

interface Props {
  dateStr: string;
}

export default function CountdownBadge({ dateStr }: Props) {
  const days = useCountdown(dateStr);

  if (days < 0) return null;

  // Urgency is carried by color *and* an icon, with on-* ink for contrast on every theme.
  const tone = days === 0
    ? 'bg-success text-on-success'
    : days <= 7
      ? 'bg-warning text-on-warning'
      : 'bg-accent text-on-accent';

  return (
    <span className={`${tone} t-micro num inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 shadow-chip`}>
      {days === 0 ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      ) : (
        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )}
      {formatCountdown(days)}
    </span>
  );
}
