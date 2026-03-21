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
    <div className="flex flex-col h-full w-64 shrink-0 border-r border-border-subtle overflow-hidden">
      {/* New chat */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-overlay hover:bg-surface-raised border border-border-subtle text-text-secondary hover:text-text-primary text-sm transition-colors"
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
            <p className="text-xs text-text-muted font-medium px-2 py-1">{label}</p>
            {group.map((s) => {
              const isActive = s.sessionId === activeSessionId;
              return (
                <button
                  key={s.sessionId}
                  onClick={() => onSelect(s.sessionId)}
                  title={s.summary ?? undefined}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${
                    isActive
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
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
