import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useChat } from '../../hooks/useChat';
import ChatPanel from './ChatPanel';
import { TMDB_BASE_URL, TMDB_API_TOKEN } from '../../utils/constants';
import type { WatchedItem } from '../../db/models';

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const library = useLiveQuery(() => db.watchedItems.toArray(), []) ?? [];
  const { sessionId, messages, isStreaming, error, createSession, sendMessage, destroySession } = useChat();

  const initSession = useCallback(() => {
    if (sessionId || isCreatingSession) return;
    setIsCreatingSession(true);
    setSessionError(null);
    createSession(library)
      .catch((err) => {
        console.error('Failed to create chat session:', err);
        setSessionError(String(err));
      })
      .finally(() => setIsCreatingSession(false));
  }, [sessionId, isCreatingSession, library, createSession]);

  // Create session on first open
  useEffect(() => {
    if (!isOpen) return;
    initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Destroy session when component unmounts
  useEffect(() => {
    return () => { destroySession(); };
  }, [destroySession]);

  const handleSend = useCallback(
    (text: string) => {
      if (!sessionId) return;
      sendMessage(text, sessionId);
    },
    [sessionId, sendMessage],
  );

  const handleAdd = useCallback(
    async (tmdbId: number, type: 'movie' | 'tv', title: string) => {
      const existing = await db.watchedItems.where('tmdbId').equals(tmdbId).first();
      if (existing) return;

      const contentType = type === 'tv' ? 'series' : 'movie';
      const path = type === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
      const res = await fetch(`${TMDB_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${TMDB_API_TOKEN}` },
      });
      const data = res.ok ? await res.json() : {};

      const item: Omit<WatchedItem, 'id'> = {
        tmdbId,
        contentType,
        title: data.title ?? data.name ?? title,
        posterPath: data.poster_path ?? null,
        releaseDate: data.release_date ?? data.first_air_date ?? null,
        status: 'plan_to_watch',
        userRating: null,
        notes: '',
        genreIds: (data.genres as Array<{ id: number }> | undefined)?.map((g) => g.id) ?? data.genre_ids ?? [],
        addedAt: new Date(),
        updatedAt: new Date(),
      };
      await db.watchedItems.add(item as WatchedItem);
    },
    [],
  );

  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {isOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <div className="fixed z-50 bg-surface border border-border-subtle shadow-2xl inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-[380px] md:h-[560px] md:rounded-2xl flex flex-col overflow-hidden">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              error={error}
              isCreatingSession={isCreatingSession || (!sessionId && !sessionError)}
              sessionError={sessionError}
              onSend={handleSend}
              onClose={handleClose}
              onRetry={initSession}
              onAdd={handleAdd}
            />
          </div>
        </>
      )}

      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed z-50 right-6 bottom-20 md:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-200 ${
          isOpen
            ? 'bg-surface-overlay text-text-secondary border border-border-subtle scale-95'
            : 'bg-accent hover:bg-accent-hover text-white scale-100 hover:scale-105'
        }`}
        aria-label={isOpen ? 'Close assistant' : 'Open watch assistant'}
      >
        {isOpen ? '✕' : '🎬'}
      </button>
    </>
  );
}

