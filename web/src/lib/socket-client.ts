import { io, Socket } from 'socket.io-client';
import { env } from './env';
import type { MatchUpdate } from './api.types';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

type ScoreCallback = (update: MatchUpdate) => void;
type ErrorCallback = (error: { message: string }) => void;

const subscribers = new Map<string, Set<ScoreCallback>>();
const errorSubscribers = new Map<string, Set<ErrorCallback>>();

function getSocket(): Socket {
  if (!socket) {
    socket = io(`${env.WS_BASE_URL}/scores`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      reconnectAttempts = 0;
      // Re-subscribe to all active matches
      subscribers.forEach((_callbacks, matchId) => {
        socket?.emit('match:subscribe', { matchId });
      });
    });

    socket.on('disconnect', () => {
      // Subscriptions will be re-established on reconnect
    });

    socket.on('match:snapshot', (data: MatchUpdate) => {
      const callbacks = subscribers.get(data.matchId);
      if (callbacks) {
        callbacks.forEach((cb) => cb(data));
      }
    });

    socket.on('match:update', (data: MatchUpdate) => {
      const callbacks = subscribers.get(data.matchId);
      if (callbacks) {
        callbacks.forEach((cb) => cb(data));
      }
    });

    socket.on('match:error', (data: { message: string }) => {
      errorSubscribers.forEach((callbacks) => {
        callbacks.forEach((cb) => cb(data));
      });
    });
  }
  return socket;
}

export function subscribeToMatch(
  matchId: string,
  onUpdate: ScoreCallback,
  onError?: ErrorCallback,
): () => void {
  const s = getSocket();

  if (!subscribers.has(matchId)) {
    subscribers.set(matchId, new Set());
  }
  subscribers.get(matchId)!.add(onUpdate);

  if (onError) {
    if (!errorSubscribers.has(matchId)) {
      errorSubscribers.set(matchId, new Set());
    }
    errorSubscribers.get(matchId)!.add(onError);
  }

  // Emit subscribe only if connected
  if (s.connected) {
    s.emit('match:subscribe', { matchId });
  }

  // Return unsubscribe function
  return () => {
    subscribers.get(matchId)?.delete(onUpdate);
    if (subscribers.get(matchId)?.size === 0) {
      subscribers.delete(matchId);
      if (s.connected) {
        s.emit('match:unsubscribe', { matchId });
      }
    }
    if (onError) {
      errorSubscribers.get(matchId)?.delete(onError);
      if (errorSubscribers.get(matchId)?.size === 0) {
        errorSubscribers.delete(matchId);
      }
    }
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  subscribers.clear();
  errorSubscribers.clear();
}
