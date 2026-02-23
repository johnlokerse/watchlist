import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ChatMessage } from '../../hooks/useChat';
import { useSettings } from '../../hooks/useSettings';
import ChatMessageBubble from './ChatMessage';

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
        className="inline-flex items-center gap-0.5 font-medium text-text-primary hover:text-accent transition-colors disabled:opacity-60"
      >
        {displayName}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface-raised border border-border-subtle rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
          {pinnedModels.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => { onModelChange(id); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                id === activeModel
                  ? 'text-accent bg-accent/10 font-medium'
                  : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
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
  onAdd: (tmdbId: number, type: 'movie' | 'tv', title: string) => Promise<void>;
  pinnedModels: string[];
  activeModel: string;
  onModelChange: (id: string) => void;
}

export default function ChatPanel({ messages, isStreaming, error, isCreatingSession, sessionError, onSend, onClose, onRetry, onAdd, pinnedModels, activeModel, onModelChange }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming || isCreatingSession) return;
    setInput('');
    onSend(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">🎬</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Watchlist Assistant</p>
            <p className="text-xs text-text-muted flex items-center gap-1 flex-wrap">
              {settings.openrouterEnabled && (pinnedModels.length > 0 || activeModel) ? (
                <>
                  <span>Powered by OpenRouter via GitHub Copilot -</span>
                  <HeaderModelPicker
                    pinnedModels={pinnedModels}
                    activeModel={activeModel}
                    onModelChange={onModelChange}
                    disabled={isStreaming || isCreatingSession}
                  />
                </>
              ) : (
                'Powered by GitHub Copilot - claude-sonnet-4.6'
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-overlay shrink-0"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {isEmpty && !isCreatingSession && (
          <div className="space-y-4">
            <p className="text-text-muted text-sm text-center pt-2">
              Ask me anything about your watchlist ✨
            </p>
            <div className="flex flex-col gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="text-left text-sm px-3 py-2 rounded-xl bg-surface-overlay hover:bg-surface-raised border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCreatingSession && isEmpty && (
          <div className="flex items-center justify-center pt-8">
            <div className="text-text-muted text-sm animate-pulse">Initializing assistant…</div>
          </div>
        )}

        {sessionError && (
          <div className="flex flex-col items-center gap-3 pt-8 px-2">
            <p className="text-danger text-sm text-center">Could not connect to the assistant.</p>
            <p className="text-text-muted text-xs text-center break-all">{sessionError}</p>
            <p className="text-text-muted text-xs text-center">Make sure <code className="bg-surface-overlay px-1 rounded">npm run dev</code> is running and the Copilot CLI is installed.</p>
            <button
              onClick={onRetry}
              className="mt-1 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-xl transition-colors"
            >
              Retry
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
          <p className="text-xs text-danger text-center">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border-subtle">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your watchlist…"
            rows={1}
            disabled={isStreaming || isCreatingSession}
            className="flex-1 resize-none bg-surface-overlay border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
            style={{ maxHeight: '96px', overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isCreatingSession}
            className="shrink-0 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
          >
            {isStreaming ? '…' : '↑'}
          </button>
        </div>
        <p className="text-xs text-text-muted mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
