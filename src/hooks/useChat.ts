import { useState, useCallback, useRef } from 'react';
import type { WatchedItem } from '../db/models';

function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (plain HTTP)
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const n = Number(c);
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
  });
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const createSession = useCallback(async (library: WatchedItem[]) => {
    const res = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ library }),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    const data = await res.json() as { sessionId: string };
    setSessionId(data.sessionId);
    sessionIdRef.current = data.sessionId;
    return data.sessionId;
  }, []);

  const sendMessage = useCallback(async (text: string, sid: string) => {
    const userMsg: ChatMessage = { id: generateUUID(), role: 'user', content: text };
    const assistantId = generateUUID();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', isStreaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, message: text }),
      });

      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type: string; content?: string; message?: string };
            if (event.type === 'delta' && event.content) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.content } : m)),
              );
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
              );
            } else if (event.type === 'error') {
              throw new Error(event.message ?? 'Unknown error');
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setError(String(err));
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: 'Sorry, something went wrong.', isStreaming: false } : m)),
      );
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const destroySession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await fetch(`/api/chat/session/${sid}`, { method: 'DELETE' }).catch(() => {});
    setSessionId(null);
    sessionIdRef.current = null;
    setMessages([]);
    setError(null);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { sessionId, messages, isStreaming, error, createSession, sendMessage, destroySession, clearMessages };
}
