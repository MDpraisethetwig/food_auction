import type { ServerEvent } from '@food-auction/shared';

interface Socket {
  send(data: string): void;
  on(event: 'close', listener: () => void): void;
}

const sockets = new Map<Socket, string | null>();

export function addSocket(socket: Socket, userId: string | null) {
  sockets.set(socket, userId);
  socket.on('close', () => sockets.delete(socket));
}

export function broadcast(event: ServerEvent) {
  for (const socket of sockets.keys()) socket.send(JSON.stringify(event));
}

export function sendToUser(userId: string, event: ServerEvent) {
  for (const [socket, owner] of sockets) {
    if (owner === userId) socket.send(JSON.stringify(event));
  }
}
