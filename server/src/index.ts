import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import { CONFIG } from './config';
import { router } from './routes/api.routes';
import { initSocket } from './socket';
import { startScheduler } from './services/scheduler';
import { prisma } from './utils/prisma';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: CONFIG.CORS_ORIGIN === '*' ? true : [CONFIG.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api', router);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'BroCode Gaming Cafe API' });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(CONFIG.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Initialize Socket.io and background scheduler
if (process.env.NODE_ENV !== 'test') {
  initSocket(server);
  startScheduler();

  // Start Server
  const PORT = CONFIG.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🎮 BroCode Gaming Cafe Server running on http://localhost:${PORT}`);
    console.log(`📡 Real-time Socket.IO initialized`);
    console.log(`⏰ Background session scheduler running`);
  });
}

// Graceful Shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    server.close(() => {
      console.log('✅ Server and Prisma closed cleanly.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export { app, server };

