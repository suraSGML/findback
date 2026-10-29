import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = localStorage.getItem('findback_token') || localStorage.getItem('campusconnect_token');
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
    });
  } else {
    socket.auth = { token };
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
  }
  return socket;
}

export function joinConversationRoom(conversationId: string) {
  const s = getSocket();
  s.emit('join:conversation', conversationId);
}

export function leaveConversationRoom(conversationId: string) {
  const s = getSocket();
  s.emit('leave:conversation', conversationId);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
