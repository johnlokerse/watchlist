import { useEffect, useState } from 'react';

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
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold transition-all shrink-0 ${
          state === 'added'
            ? 'bg-green-500 text-white cursor-default'
            : state === 'loading'
              ? 'bg-accent/50 text-white cursor-wait'
              : 'bg-accent hover:bg-accent-hover text-white cursor-pointer'
        }`}
      >
        {state === 'added' ? '✓' : state === 'loading' ? '…' : '+'}
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

export default function ChatMessage({ role, content, isStreaming, onAdd }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-surface-raised text-text-primary rounded-bl-sm'
        }`}
      >
        {content ? renderMarkdown(content, onAdd) : null}
        {isStreaming && (
          <span className="inline-flex items-center gap-0.5 ml-1">
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
