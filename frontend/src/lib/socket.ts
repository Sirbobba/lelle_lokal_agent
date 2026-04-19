import { io } from 'socket.io-client';

// Singleton socket-instans som hela appen delar
export const socket = io('http://localhost:3001', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

export type { Socket } from 'socket.io-client';
