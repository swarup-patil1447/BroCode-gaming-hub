import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { CONFIG } from './config';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: CONFIG.CORS_ORIGIN === '*' ? true : [CONFIG.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  } as any);

  io.on('connection', (socket) => {
    // Support both event names for room joining
    socket.on('join_role', (role: string) => {
      socket.join(`role_${role}`);
      socket.join(role);
    });

    socket.on('join_role_room', (role: string) => {
      socket.join(`role_${role}`);
      socket.join(role);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};

export const emitToRole = (role: string, event: string, data: any) => {
  if (io) {
    io.to(`role_${role}`).to(role).emit(event, data);
  }
};

