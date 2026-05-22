import { useState } from 'react';
import { formatDate } from '../../utils/date';
import type { ReleaseTimelineEvent, ReleaseTimelineEventKind } from '../../utils/releaseTimeline';

interface Props {
  events: ReleaseTimelineEvent[];
  maxPreview?: number;
}

function EventIcon({ kind }: { kind: ReleaseTimelineEventKind }) {
  const common = {
    className: 'h-3.5 w-3.5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (kind === 'trailer' || kind === 'teaser') {
    return (
      <svg {...common}>
        <polygon points="8,6 18,12 8,18 8,6" />
      </svg>
    );
  }

  if (kind === 'digital' || kind === 'physical') {
    return (
      <svg {...common}>
        <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
        <path d="M8 2.8v4M16 2.8v4M3.5 9h17" />
      </svg>
    );
  }

  if (kind === 'episode' || kind === 'season') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m9.5 12 1.7 1.7L14.8 10" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
      <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
    </svg>
  );
}

export default function ReleaseTimeline({ events, maxPreview = 6 }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const visible = expanded ? events : events.slice(0, maxPreview);
  const nextUpcomingIndex = visible.findIndex((event) => event.date >= today);
  const activeIndex = nextUpcomingIndex >= 0 ? nextUpcomingIndex : visible.length - 1;

  return (
    <div className="app-panel-soft p-3 md:p-4">
      <h3 className="section-title mb-3">Release timeline</h3>

      <div className="relative overflow-x-auto pb-1">
        <div className="absolute left-5 right-5 top-[15px] h-px bg-border-subtle" />
        <div className="relative flex min-w-max gap-4 md:gap-6">
          {visible.map((event, index) => {
            const done = event.date < today;
            const active = index === activeIndex;
            const tone = active ? 'text-accent' : done ? 'text-text-primary' : 'text-text-secondary';

            return (
              <div key={event.id} className="w-28 shrink-0">
                <div className={`relative mb-2 flex h-8 w-8 items-center justify-center rounded-full border bg-surface ${tone}`}>
                  <EventIcon kind={event.kind} />
                </div>
                <p className={`text-sm font-semibold ${active ? 'text-accent' : 'text-text-primary'}`}>{formatDate(event.date)}</p>
                {event.url ? (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-0.5 block text-sm ${active ? 'text-accent' : 'text-text-secondary'} hover:text-accent transition`}
                  >
                    {event.title}
                  </a>
                ) : (
                  <p className={`mt-0.5 text-sm ${active ? 'text-accent' : 'text-text-secondary'}`}>{event.title}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {events.length > maxPreview && (
        <button
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 w-full rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-overlay hover:text-text-primary"
        >
          {expanded ? 'Show less events' : 'View All Events'}
        </button>
      )}
    </div>
  );
}
