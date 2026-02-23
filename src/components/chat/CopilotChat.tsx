import { useState, useCallback, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSettings } from '../../hooks/useSettings';
import { addToLibrary } from '../../db/hooks';
import ChatPanel from './ChatPanel';
import { TMDB_BASE_URL, TMDB_API_TOKEN } from '../../utils/constants';

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const { settings, updateSettings } = useSettings();
  const { sessionId, messages, isStreaming, error, createSession, sendMessage, destroySession } = useChat();

  const initSession = useCallback((modelOverride?: string) => {
    if (sessionId || isCreatingSession) return;
    setIsCreatingSession(true);
    setSessionError(null);
    // Library context is now read from SQLite on the server side
    createSession([], modelOverride)
      .catch((err) => {
        console.error('Failed to create chat session:', err);
        setSessionError(String(err));
      })
      .finally(() => setIsCreatingSession(false));
  }, [sessionId, isCreatingSession, createSession]);

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

  const handleModelChange = useCallback(async (id: string) => {
    updateSettings({ openrouterModel: id });
    await destroySession();
    setIsCreatingSession(true);
    setSessionError(null);
    createSession([], id)
      .catch((err) => {
        console.error('Failed to create chat session after model switch:', err);
        setSessionError(String(err));
      })
      .finally(() => setIsCreatingSession(false));
  }, [updateSettings, destroySession, createSession]);

  const handleSend = useCallback(
    (text: string) => {
      if (!sessionId) return;
      sendMessage(text, sessionId);
    },
    [sessionId, sendMessage],
  );

  const handleAdd = useCallback(
    async (tmdbId: number, type: 'movie' | 'tv', title: string) => {
      // Check existence via REST API
      const contentType = type === 'tv' ? 'series' : 'movie';
      try {
        const check = await fetch(`/api/library/${tmdbId}/${contentType}`);
        if (check.ok) return; // already exists
      } catch { /* proceed with add */ }

      const path = type === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
      const res = await fetch(`${TMDB_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${TMDB_API_TOKEN}` },
      });
      const data = res.ok ? await res.json() : {};

      await addToLibrary({
        tmdbId,
        contentType,
        title: data.title ?? data.name ?? title,
        posterPath: data.poster_path ?? null,
        releaseDate: data.release_date ?? data.first_air_date ?? null,
        status: 'plan_to_watch',
        userRating: null,
        notes: '',
        genreIds: (data.genres as Array<{ id: number }> | undefined)?.map((g) => g.id) ?? data.genre_ids ?? [],
      });
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
              pinnedModels={settings.openrouterModels}
              activeModel={settings.openrouterModel}
              onModelChange={handleModelChange}
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

