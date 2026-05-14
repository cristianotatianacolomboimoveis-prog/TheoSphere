import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';
import { CONFIG } from '@/lib/config';

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export function useCollaboration(roomId: string, initialContent: string, onUpdate: (content: string) => void) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const ydocRef = useRef(new Y.Doc());
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    // Use centralized config for backend URL
    const backendUrl = CONFIG.API_BASE_URL.replace('/api', '') + '/collaboration';
    const s = io(backendUrl, {
      transports: ['websocket'],
    });

    setSocket(s);

    const userName = `Pastor ${Math.floor(Math.random() * 100)}`;
    const userColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

    s.emit('join_room', { roomId, user: { id: s.id, name: userName, color: userColor } });

    s.on('presence_update', (roomUsers: string[]) => {
      setUsers(roomUsers);
    });

    s.on('sync_update', (update: ArrayBuffer) => {
      isRemoteUpdate.current = true;
      Y.applyUpdate(ydocRef.current, new Uint8Array(update));
      const text = ydocRef.current.getText('content').toString();
      onUpdate(text);
      isRemoteUpdate.current = false;
    });

    s.on('cursor_moved', (data: any) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          userName: data.user?.name || 'Anônimo',
          color: data.user?.color || '#3b82f6',
          x: data.position.x,
          y: data.position.y
        }
      }));
    });

    return () => {
      s.disconnect();
    };
  }, [roomId]);

  const updateContent = useCallback((content: string) => {
    if (isRemoteUpdate.current) return;

    const ytext = ydocRef.current.getText('content');
    
    if (ytext.toString() !== content) {
      ydocRef.current.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, content);
      });

      const update = Y.encodeStateAsUpdate(ydocRef.current);
      socket?.emit('sync_update', { roomId, update });
    }
  }, [socket, roomId]);

  const updateCursor = useCallback((x: number, y: number) => {
    socket?.emit('cursor_move', { 
      roomId, 
      position: { x, y },
      user: { name: 'Você', color: '#3b82f6' } // Idealmente viria do context
    });
  }, [socket, roomId]);

  return { users, cursors, updateContent, updateCursor };
}
