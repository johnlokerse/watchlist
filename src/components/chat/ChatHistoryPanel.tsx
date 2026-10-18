import type { SessionMeta } from '../../hooks/useChatHistory';

interface Props {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDate(sessions: SessionMeta[]): Map<string, SessionMeta[]> {
  const groups = new Map<string, SessionMeta[]>();
  for (const s of sessions) {
    const label = formatRelativeDate(s.modifiedTime);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(s);
  }
  return groups;
}

function sessionTitle(s: SessionMeta): string {
  if (s.summary) return s.summary.length > 42 ? s.summary.slice(0, 40) + '…' : s.summary;
  return 'New conversation';
}

export default function ChatHistoryPanel({ sessions, activeSessionId, isLoading, onSelect, onNewChat }: Props) {
  const groups = groupByDate(sessions);

  return (
    <div className="flex h-full w-64 shrink-0 flex-col overflow-hidden shadow-[inset_-1px_0_0_var(--color-hairline)]">
      {/* New chat */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <button
          onClick={onNewChat}
          className="press flex min-h-9 w-full items-center gap-2 rounded-[10px] bg-fill px-3 text-[0.875rem] font-semibold text-text-primary transition-colors hover:bg-fill-strong"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && sessions.length === 0 && (
          <p className="text-xs text-text-muted text-center py-6 animate-pulse">Loading…</p>
        )}

        {!isLoading && sessions.length === 0 && (
          <p className="text-xs text-text-muted text-center py-6">No previous chats yet</p>
        )}

        {Array.from(groups.entries()).map(([label, group]) => (
          <div key={label} className="mb-3">
            <p className="t-label px-2 pb-1 pt-2">{label}</p>
            {group.map((s) => {
              const isActive = s.sessionId === activeSessionId;
              return (
                <button
                  key={s.sessionId}
                  onClick={() => onSelect(s.sessionId)}
                  title={s.summary ?? undefined}
                  aria-current={isActive ? 'true' : undefined}
                  className={`min-h-9 w-full truncate rounded-[10px] px-3 text-left text-[0.8125rem] transition-colors ${
                    isActive
                      ? 'bg-accent/15 font-semibold text-accent'
                      : 'text-text-secondary hover:bg-fill hover:text-text-primary'
                  }`}
                >
                  {sessionTitle(s)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
