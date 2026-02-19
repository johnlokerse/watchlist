import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ChatMessage } from '../../hooks/useChat';
import ChatMessageBubble from './ChatMessage';

const STARTER_QUESTIONS = [
  'What should I watch tonight?',
  'Recommend something based on my taste',
  'What sci-fi have I not finished yet?',
  'Any hidden gems in my watchlist?',
];

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
}

export default function ChatPanel({ messages, isStreaming, error, isCreatingSession, sessionError, onSend, onClose, onRetry, onAdd }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <div>
            <p className="text-sm font-semibold text-text-primary">Watchlist Assistant</p>
            <p className="text-xs text-text-muted">Powered by GitHub Copilot - claude-sonnet-4.6</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-overlay"
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
