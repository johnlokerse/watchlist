import { useCountdown } from '../../hooks/useCountdown';
import { formatCountdown } from '../../utils/date';

interface Props {
  dateStr: string;
}

export default function CountdownBadge({ dateStr }: Props) {
  const days = useCountdown(dateStr);

  if (days < 0) return null;

  const bgColor = days === 0 ? 'bg-success' : days <= 7 ? 'bg-warning' : 'bg-accent';

  return (
    <span className={`${bgColor} text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm`}>
      {formatCountdown(days)}
    </span>
  );
}
