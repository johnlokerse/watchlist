import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { spring } from '../../design/motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Sheet from '../ui/Sheet';
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
    <svg className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
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
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const fabRef = useRef<HTMLButtonElement>(null);

  const { settings, updateSettings } = useSettings();
  const { sessionId, messages, isStreaming, error, createSession, sendMessage, retryLast, destroySession, setMessages, setSessionId } = useChat();
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

  // Escape closes the desktop panel (the mobile sheet handles its own keys).
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) setIsExpanded(false);
        else handleClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isMobile, isExpanded, handleClose]);

  const panel = (onClose: () => void) => (
    <ChatPanel
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      isCreatingSession={isCreatingSession || (!sessionId && !sessionError)}
      sessionError={sessionError}
      onSend={handleSend}
      onClose={onClose}
      onRetry={initSession}
      onRetryMessage={retryLast}
      onNewChat={handleNewChat}
      onAdd={handleAdd}
      pinnedModels={settings.openrouterModels}
      activeModel={settings.openrouterModel}
      onModelChange={handleModelChange}
      isExpanded={isExpanded && !isMobile}
      onToggleExpand={handleToggleExpand}
      sessions={sessions}
      activeSessionId={sessionId}
      isLoadingSessions={isLoadingSessions}
      onSelectSession={handleSelectSession}
    />
  );

  return (
    <>
      {/* Mobile: a draggable bottom sheet */}
      {isOpen && isMobile && (
        <Sheet onClose={handleClose} labelledBy="watch-assistant-title" tall>
          {(dismiss) => panel(dismiss)}
        </Sheet>
      )}

      {/* Desktop: a floating, non-modal panel that grows out of the button (no scrim);
          expanded it becomes a modal focus surface with a dimming scrim. */}
      <AnimatePresence>
        {isOpen && !isMobile && isExpanded && (
          <m.div
            key="chat-scrim"
            className="fixed inset-0 z-40 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleToggleExpand}
            aria-hidden="true"
          />
        )}
        {isOpen && !isMobile && (
          <m.div
            key="chat-panel"
            layout
            role="dialog"
            aria-labelledby="watch-assistant-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ ...spring.default, opacity: { duration: 0.15 } }}
            style={{ transformOrigin: 'bottom right' }}
            className={`material-sheet shadow-sheet fixed z-50 flex flex-col overflow-hidden rounded-[20px] ${
              isExpanded
                ? 'inset-x-0 top-8 mx-auto h-[calc(100dvh-4rem)] w-[min(1040px,92vw)]'
                : 'bottom-24 right-6 h-[min(600px,calc(100dvh-8rem))] w-[400px]'
            }`}
          >
            {panel(handleClose)}
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!(isOpen && isMobile) && (
          <m.button
            key="chat-fab"
            ref={fabRef}
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.default}
            onClick={() => setIsOpen((o) => !o)}
            className={`mobile-safe-fab press fixed right-3 top-[10px] z-50 grid h-10 w-10 place-items-center rounded-full shadow-card md:bottom-6 md:right-6 md:top-auto md:h-14 md:w-14 ${
              isOpen
                ? 'material-sheet text-text-secondary'
                : 'bg-accent text-on-accent hover:bg-accent-hover'
            }`}
            aria-label={isOpen ? 'Close assistant' : 'Open watch assistant (⌘K)'}
            aria-expanded={isOpen}
            title={isOpen ? 'Close assistant' : 'Open watch assistant (⌘K / Ctrl+K)'}
          >
            {isOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <AssistantIcon />
            )}
          </m.button>
        )}
      </AnimatePresence>
    </>
  );
}
