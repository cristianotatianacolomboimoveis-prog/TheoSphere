import { useEffect, useRef, useCallback } from 'react';

type WorkerMessageType = 
  | 'FILTER_BY_TIME' 
  | 'FIND_LOCATIONS_BY_VERSE' 
  | 'FETCH_BIBLE_CHAPTER' 
  | 'FETCH_STRONGS'
  | 'FETCH_INTERLINEAR_CHAPTER'
  | 'LOAD_OFFLINE_TILES';

let globalWorker: Worker | null = null;
const messageListeners = new Set<(type: string, payload: any) => void>();

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  if (!globalWorker) {
    try {
      globalWorker = new Worker(new URL('../lib/geoWorker.ts?v=' + Date.now(), import.meta.url));
      globalWorker.onmessage = (event) => {
        const { type, payload } = event.data;
        messageListeners.forEach(listener => {
          try {
            listener(type, payload);
          } catch (e) {
            console.error("[useTheoWorker] Listener error:", e);
          }
        });
      };
      globalWorker.onerror = (err: any) => {
        const errorDetails = `Msg: ${err.message} | File: ${err.filename} | Line: ${err.lineno}`;
        console.error("[useTheoWorker] Global worker error:", errorDetails);
        if (err.error) console.error("[useTheoWorker] Underlying error:", err.error);
      };
    } catch (e: any) {
      console.error("[useTheoWorker] Failed to create worker:", e.message || e);
    }
  }
  return globalWorker;
}

export function useTheoWorker(onMessage?: (type: string, payload: any) => void) {
  const onMessageRef = useRef(onMessage);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const listener = (type: string, payload: any) => {
      onMessageRef.current?.(type, payload);
    };

    messageListeners.add(listener);
    getOrCreateWorker(); // Ensure it exists

    return () => {
      messageListeners.delete(listener);
    };
  }, []);

  const postMessage = useCallback((type: WorkerMessageType, payload: any) => {
    const worker = getOrCreateWorker();
    worker?.postMessage({ type, payload });
  }, []);

  return { postMessage };
}
