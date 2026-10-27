"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const api_routes_1 = require("./routes/api.routes");
const socket_1 = require("./socket");
const scheduler_1 = require("./services/scheduler");
const prisma_1 = require("./utils/prisma");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Middleware
const configuredOrigins = config_1.CONFIG.CORS_ORIGIN
    ? config_1.CONFIG.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (config_1.CONFIG.CORS_ORIGIN === '*' ||
            allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.endsWith('.netlify.app')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
// API Routes
app.use('/api', api_routes_1.router);
// Health check endpoint (accessible at both /health and /api/health)
const healthHandler = (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), service: 'BroCode Gaming Cafe API' });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: err.message || 'Internal server error',
        ...(config_1.CONFIG.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
});
// Initialize Socket.io and background scheduler
if (process.env.NODE_ENV !== 'test') {
    (0, socket_1.initSocket)(server);
    (0, scheduler_1.startScheduler)();
    // Start Server
    const PORT = Number(config_1.CONFIG.PORT) || 5000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🎮 BroCode Gaming Cafe Server running on http://localhost:${PORT}`);
        console.log(`📡 Real-time Socket.IO initialized`);
        console.log(`⏰ Background session scheduler running`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use. Please terminate any process using port ${PORT} before starting the server.`);
        }
        else {
            console.error('❌ Server startup error:', err);
        }
    });
}
// Graceful Shutdown
const handleShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
        await prisma_1.prisma.$disconnect();
        server.close(() => {
            console.log('✅ Server and Prisma closed cleanly.');
            process.exit(0);
        });
    }
    catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
