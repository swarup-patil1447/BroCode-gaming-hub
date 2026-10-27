import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { CONFIG } from './config';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
  const configuredOrigins = CONFIG.CORS_ORIGIN
    ? CONFIG.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];

  const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultOrigins]));

  io = new SocketIOServer(server, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (
          CONFIG.CORS_ORIGIN === '*' ||
          allowedOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.endsWith('.netlify.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
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

