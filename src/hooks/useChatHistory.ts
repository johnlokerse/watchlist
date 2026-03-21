import { useState, useCallback } from 'react';
import type { ChatMessage } from './useChat';

export interface SessionMeta {
  sessionId: string;
  startTime: string;
  modifiedTime: string;
  summary: string | null;
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/chat/sessions');
      if (!res.ok) throw new Error(`Failed to load sessions: ${res.status}`);
      const data = await res.json() as SessionMeta[];
      setSessions(data);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const resumeSession = useCallback(async (sessionId: string): Promise<{ sessionId: string; messages: ChatMessage[] }> => {
    const resumeRes = await fetch('/api/chat/session/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!resumeRes.ok) throw new Error(`Failed to resume session: ${resumeRes.status}`);
    const { sessionId: activeId } = await resumeRes.json() as { sessionId: string };

    const msgsRes = await fetch(`/api/chat/session/${activeId}/messages`);
    if (!msgsRes.ok) throw new Error(`Failed to fetch messages: ${msgsRes.status}`);
    const messages = await msgsRes.json() as ChatMessage[];

    return { sessionId: activeId, messages };
  }, []);

  return { sessions, isLoadingSessions, loadSessions, resumeSession };
}
