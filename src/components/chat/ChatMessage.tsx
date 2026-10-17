import { memo, useEffect, useState } from 'react';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  onAdd?: (tmdbId: number, type: 'movie' | 'tv', title: string) => Promise<void>;
}

function AddButton({ tmdbId, type, title, onAdd }: {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  onAdd: (tmdbId: number, type: 'movie' | 'tv', title: string) => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'added'>('idle');

  useEffect(() => {
    let cancelled = false;
    const contentType = type === 'tv' ? 'series' : 'movie';

    const checkExisting = async () => {
      try {
        const res = await fetch(`/api/library/${tmdbId}/${contentType}`);
        if (!cancelled && res.ok) {
          setState('added');
        }
      } catch (err) {
        console.error('Failed to check watchlist status:', err);
      }
    };

    void checkExisting();
    return () => { cancelled = true; };
  }, [tmdbId, type]);

  const handleClick = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      await onAdd(tmdbId, type, title);
      setState('added');
    } catch {
      setState('idle');
    }
  };

  return (
    <span className="inline-flex items-center gap-1 mx-0.5">
      <span className="font-medium">{title}</span>
      <button
        onClick={handleClick}
        disabled={state !== 'idle'}
        title={state === 'added' ? 'Added to watchlist' : 'Add to watchlist'}
        aria-label={state === 'added' ? `${title} is in your watchlist` : `Add ${title} to watchlist`}
        className={`press hit-44 inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full transition-colors ${
          state === 'added'
            ? 'bg-success text-on-success cursor-default'
            : state === 'loading'
              ? 'bg-accent/50 text-on-accent cursor-wait'
              : 'bg-accent text-on-accent hover:bg-accent-hover cursor-pointer'
        }`}
      >
        {state === 'added' ? (
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
        ) : state === 'loading' ? (
          <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
        ) : (
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        )}
      </button>
    </span>
  );
}

function renderMarkdown(text: string, onAdd?: Props['onAdd']): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="list-disc pl-4 my-1 space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item, onAdd)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith('- ') || line.startsWith('• ')) {
      listItems.push(line.slice(2));
    } else {
      flushList();
      if (i > 0 && line === '') {
        nodes.push(<br key={`br-${i}`} />);
      } else if (line !== '') {
        nodes.push(<span key={`line-${i}`}>{renderInline(line, onAdd)}{i < lines.length - 1 ? ' ' : ''}</span>);
      }
    }
  });
  flushList();
  return nodes;
}

function renderInline(text: string, onAdd?: Props['onAdd']): React.ReactNode[] {
  // Split on bold, italic, and add: links — [Title](add:movie/123) or [Title](add:tv/123)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(add:[^)]+\))/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return <strong key={i}>{renderInline(inner, onAdd)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      const inner = part.slice(1, -1);
      return <em key={i}>{renderInline(inner, onAdd)}</em>;
    }
    // [Title](add:movie/123) or [Title](add:tv/123)
    const addMatch = part.match(/^\[([^\]]+)\]\(add:(movie|tv)\/(\d+)\)$/);
    if (addMatch && onAdd) {
      const [, title, type, id] = addMatch;
      return (
        <AddButton key={i} tmdbId={Number(id)} type={type as 'movie' | 'tv'} title={title} onAdd={onAdd} />
      );
    }
    if (addMatch && !onAdd) {
      return <span key={i} className="font-medium">{addMatch[1]}</span>;
    }
    return part;
  });
}

function ChatMessage({ role, content, isStreaming, onAdd }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2 text-[0.9375rem] leading-[1.45] tracking-[-0.003em] ${
          isUser
            ? 'rounded-[20px] rounded-br-md bg-accent text-on-accent'
            : 'rounded-[20px] rounded-bl-md bg-fill text-text-primary'
        }`}
      >
        {content ? renderMarkdown(content, onAdd) : null}
        {isStreaming && (
          <span className="ml-1 inline-flex items-center gap-0.5" role="status" aria-label="Assistant is typing">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-dot-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessage);
