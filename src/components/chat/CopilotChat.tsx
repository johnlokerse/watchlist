import { useState, useCallback, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useSettings } from '../../hooks/useSettings';
import { useChatHistory } from '../../hooks/useChatHistory';
import { addToLibrary } from '../../db/hooks';
import ChatPanel from './ChatPanel';
import { TMDB_BASE_URL } from '../../utils/constants';

interface TMDBChatDetails {
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  genre_ids?: number[];
  genres?: Array<{ id: number }>;
}

function AssistantIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16v12.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V7Z" />
      <path d="m4 7 2.8-4h4L8 7M12 7l2.8-4h4L16 7M4 11h16" />
      <path d="M9 15h6M12 14v2" />
    </svg>
  );
}

export default function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const { settings, updateSettings } = useSettings();
  const { sessionId, messages, isStreaming, error, createSession, sendMessage, destroySession, setMessages, setSessionId } = useChat();
  const { sessions, isLoadingSessions, loadSessions, resumeSession } = useChatHistory();

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

  // Load session history whenever the panel expands
  useEffect(() => {
    if (isExpanded) loadSessions();
  }, [isExpanded, loadSessions]);

  // Destroy session when component unmounts
  useEffect(() => {
    return () => { destroySession(); };
  }, [destroySession]);

  // CMD+K (macOS) / CTRL+K (Windows/Linux) toggles the chat panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleNewChat = useCallback(async () => {
    await destroySession();
    setIsCreatingSession(true);
    setSessionError(null);
    createSession([], settings.openrouterModel)
      .catch((err) => {
        console.error('Failed to create new chat session:', err);
        setSessionError(String(err));
      })
      .finally(() => setIsCreatingSession(false));
  }, [destroySession, createSession, settings.openrouterModel]);

  const handleSelectSession = useCallback(async (selectedId: string) => {
    if (selectedId === sessionId) return;
    try {
      // Disconnect current session without destroying it
      await destroySession();
      setIsCreatingSession(true);
      setSessionError(null);
      const { sessionId: resumedId, messages: historicMessages } = await resumeSession(selectedId);
      setSessionId(resumedId);
      setMessages(historicMessages);
    } catch (err) {
      console.error('Failed to resume session:', err);
      setSessionError(String(err));
    } finally {
      setIsCreatingSession(false);
    }
  }, [sessionId, destroySession, resumeSession, setSessionId, setMessages]);

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
      const url = new URL(`${TMDB_BASE_URL}${path}`, window.location.origin);
      url.searchParams.set('append_to_response', 'watch/providers');
      const res = await fetch(url.toString());
      const data: TMDBChatDetails = res.ok ? await res.json() as TMDBChatDetails : {};

      await addToLibrary({
        tmdbId,
        contentType,
        title: data.title ?? data.name ?? title,
        posterPath: data.poster_path ?? null,
        releaseDate: data.release_date ?? data.first_air_date ?? null,
        status: 'plan_to_watch',
        userRating: null,
        notes: '',
        genreIds: data.genres?.map((g) => g.id) ?? data.genre_ids ?? [],
        watchedAt: null,
      });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsExpanded(false);
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((e) => !e);
  }, []);

  return (
    <>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          {/* Desktop expanded backdrop */}
          {isExpanded && (
            <div className="hidden md:block fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={handleToggleExpand} />
          )}
          <div className={`fixed z-50 bg-surface border border-border-subtle shadow-2xl flex flex-col overflow-hidden inset-0 md:inset-auto md:rounded-lg ${
            isExpanded
              ? 'md:top-[calc(3.5rem+1rem)] md:left-1/2 md:-translate-x-1/2 md:w-[min(1040px,92vw)] md:h-[calc(100vh-3.5rem-2rem)]'
              : 'md:bottom-24 md:right-6 md:w-[380px] md:h-[560px]'
          }`}>
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              error={error}
              isCreatingSession={isCreatingSession || (!sessionId && !sessionError)}
              sessionError={sessionError}
              onSend={handleSend}
              onClose={handleClose}
              onRetry={initSession}
              onNewChat={handleNewChat}
              onAdd={handleAdd}
              pinnedModels={settings.openrouterModels}
              activeModel={settings.openrouterModel}
              onModelChange={handleModelChange}
              isExpanded={isExpanded}
              onToggleExpand={handleToggleExpand}
              sessions={sessions}
              activeSessionId={sessionId}
              isLoadingSessions={isLoadingSessions}
              onSelectSession={handleSelectSession}
            />
          </div>
        </>
      )}

      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`mobile-safe-fab fixed z-50 right-3 top-[13px] h-[46px] w-[46px] md:top-auto md:right-6 md:bottom-6 md:h-14 md:w-14 rounded-lg shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-surface-overlay text-text-secondary border border-border-subtle scale-95'
            : 'bg-accent hover:bg-accent-hover text-white scale-100 hover:scale-105'
        }`}
        aria-label={isOpen ? 'Close assistant' : 'Open watch assistant (⌘K)'}
        title={isOpen ? 'Close assistant' : 'Open watch assistant (⌘K / Ctrl+K)'}
      >
        {isOpen ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <AssistantIcon />
        )}
      </button>
    </>
  );
}
