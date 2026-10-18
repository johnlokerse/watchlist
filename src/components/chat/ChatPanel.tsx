import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ChatMessage } from '../../hooks/useChat';
import { useSettings } from '../../hooks/useSettings';
import ChatMessageBubble from './ChatMessage';
import ChatHistoryPanel from './ChatHistoryPanel';
import type { SessionMeta } from '../../hooks/useChatHistory';

const STARTER_QUESTIONS = [
  'What should I watch tonight?',
  'Recommend something based on my taste',
  'What sci-fi have I not finished yet?',
  'Any hidden gems in my watchlist?',
];

// ── Inline model switcher for the chat header ─────────────────────────────────

interface HeaderModelPickerProps {
  pinnedModels: string[];
  activeModel: string;
  onModelChange: (id: string) => void;
  disabled: boolean;
}

function HeaderModelPicker({ pinnedModels, activeModel, onModelChange, disabled }: HeaderModelPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shortName = (id: string) => id.split('/').pop() ?? id;
  const displayName = shortName(activeModel || pinnedModels[0] || '');
  const canSwitch = pinnedModels.length > 1;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!canSwitch) {
    return <span className="font-medium text-text-primary">{displayName}</span>;
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-0.5 font-medium text-text-primary hover:text-accent transition-colors disabled:opacity-60"
      >
        {displayName}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="material-sheet shadow-sheet absolute top-full left-0 z-50 mt-1.5 min-w-[160px] origin-top-left rounded-xl p-1"
          role="listbox"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          {pinnedModels.map((id) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={id === activeModel}
              onClick={() => { onModelChange(id); setOpen(false); }}
              className={`min-h-9 w-full rounded-lg px-3 text-left text-[0.8125rem] transition-colors ${
                id === activeModel
                  ? 'bg-accent/15 font-semibold text-accent'
                  : 'text-text-secondary hover:bg-fill hover:text-text-primary'
              }`}
            >
              {shortName(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  isCreatingSession: boolean;
  sessionError: string | null;
  onSend: (text: string) => void;
  onClose: () => void;
  onRetry: () => void;
  onRetryMessage?: () => void;
  onNewChat: () => void;
  onAdd: (tmdbId: number, type: 'movie' | 'tv', title: string) => Promise<void>;
  pinnedModels: string[];
  activeModel: string;
  onModelChange: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  // Chat history (only used when isExpanded)
  sessions: SessionMeta[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  onSelectSession: (sessionId: string) => void;
}

export default function ChatPanel({ messages, isStreaming, error, isCreatingSession, sessionError, onSend, onClose, onRetry, onRetryMessage, onNewChat, onAdd, pinnedModels, activeModel, onModelChange, isExpanded, onToggleExpand, sessions, activeSessionId, isLoadingSessions, onSelectSession }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const { settings } = useSettings();

  // Follow new content only while the reader is already at the bottom; never yank them
  // back down while they scroll up to read. Instant (not smooth) while tokens stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!isCreatingSession) textareaRef.current?.focus({ preventScroll: true });
  }, [isCreatingSession]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming || isCreatingSession) return;
    setInput('');
    stickToBottomRef.current = true;
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;
  const iconButton = 'press hit-44 grid h-8 w-8 place-items-center rounded-full bg-fill text-text-secondary transition-colors hover:bg-fill-strong hover:text-text-primary';

  return (
    <div className="flex h-full min-h-0 flex-row overflow-hidden">
      {/* History sidebar — desktop expanded only */}
      {isExpanded && (
        <ChatHistoryPanel
          sessions={sessions}
          activeSessionId={activeSessionId}
          isLoading={isLoadingSessions}
          onSelect={onSelectSession}
          onNewChat={onNewChat}
        />
      )}

      {/* Main chat column */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {/* Header (also the drag handle of the mobile sheet) */}
      <div data-sheet-handle className="hairline-bottom flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-2 md:pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-on-accent shadow-chip">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
              <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
            </svg>
          </span>
          <div className="min-w-0">
            <p id="watch-assistant-title" className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-text-primary">Watch Assistant</p>
            <div className="flex flex-wrap items-center gap-1 text-[0.75rem] text-text-muted">
              {settings.openrouterEnabled && (pinnedModels.length > 0 || activeModel) ? (
                <>
                  <span>AI · OpenRouter ·</span>
                  <HeaderModelPicker
                    pinnedModels={pinnedModels}
                    activeModel={activeModel}
                    onModelChange={onModelChange}
                    disabled={isStreaming || isCreatingSession}
                  />
                </>
              ) : (
                'AI · GitHub Copilot · gpt-6-luna'
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isEmpty && (
            <button
              type="button"
              onClick={onNewChat}
              disabled={isStreaming || isCreatingSession}
              className={`${iconButton} disabled:opacity-40`}
              aria-label="New chat"
              title="New chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
          {/* Expand / collapse — desktop only */}
          <button
            type="button"
            onClick={onToggleExpand}
            className={`${iconButton} hidden md:grid`}
            aria-label={isExpanded ? 'Collapse chat' : 'Expand chat'}
            title={isExpanded ? 'Collapse chat' : 'Expand chat'}
          >
            {isExpanded ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="10" y1="14" x2="3" y2="21" />
                <line x1="21" y1="3" x2="14" y2="10" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
          <button type="button" onClick={onClose} className={iconButton} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-busy={isStreaming}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {isEmpty && !isCreatingSession && !sessionError && (
          <div className="space-y-4">
            <p className="t-caption pt-2 text-center">Ask me anything about your watchlist</p>
            <div className="grouped">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSend(q)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[0.9375rem] text-text-primary transition-colors active:bg-fill [@media(hover:hover)]:hover:bg-fill"
                >
                  {q}
                  <svg className="h-4 w-4 shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {isCreatingSession && isEmpty && (
          <div className="flex items-center justify-center gap-2 pt-10 text-text-muted" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-fill-strong border-t-accent" aria-hidden="true" />
            <span className="t-callout">Starting assistant…</span>
          </div>
        )}

        {sessionError && (
          <div className="flex flex-col items-center gap-3 px-2 pt-8 text-center" role="alert">
            <p className="t-headline text-text-primary">Couldn't reach the assistant</p>
            <p className="t-caption break-all">{sessionError}</p>
            <p className="t-caption">Make sure the server is running and the Copilot CLI is installed.</p>
            <button type="button" onClick={onRetry} className="press mt-1 min-h-9 rounded-full bg-accent px-5 text-[0.875rem] font-semibold text-on-accent">
              Try again
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
            onAdd={onAdd}
          />
        ))}

        {error && (
          <div className="flex flex-col items-center gap-2 pt-1" role="alert">
            <p className="t-caption text-center text-danger">Something went wrong: {error}</p>
            {onRetryMessage && (
              <button
                type="button"
                onClick={onRetryMessage}
                disabled={isStreaming}
                className="press min-h-8 rounded-full bg-fill px-4 text-[0.8125rem] font-semibold text-text-primary hover:bg-fill-strong disabled:opacity-40"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="hairline-top shrink-0 px-3 pb-3 pt-2.5">
        <div className="flex items-end gap-2 rounded-[22px] bg-fill p-1.5 pl-4 focus-within:ring-2 focus-within:ring-accent/50">
          <textarea
            ref={textareaRef}
            data-autofocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your watchlist…"
            aria-label="Message"
            rows={1}
            disabled={isCreatingSession}
            className="max-h-24 min-h-8 flex-1 resize-none self-center overflow-y-auto bg-transparent py-1.5 text-base text-text-primary outline-none focus-visible:outline-none placeholder:text-text-muted disabled:opacity-50 md:text-[0.9375rem]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isCreatingSession}
            aria-label={isStreaming ? 'Assistant is responding' : 'Send'}
            className="press hit-44 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-35"
          >
            {isStreaming ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 hidden text-center text-[0.6875rem] text-text-muted md:block">Enter to send · Shift+Enter for a new line · AI can make mistakes</p>
      </div>
      </div>
    </div>
  );
}
