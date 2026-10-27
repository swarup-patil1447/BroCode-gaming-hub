"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToRole = exports.emitToAll = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
let io = null;
const initSocket = (server) => {
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
    io = new socket_io_1.Server(server, {
        cors: {
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
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        // Support both event names for room joining
        socket.on('join_role', (role) => {
            socket.join(`role_${role}`);
            socket.join(role);
        });
        socket.on('join_role_room', (role) => {
            socket.join(`role_${role}`);
            socket.join(role);
        });
        socket.on('disconnect', () => { });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
exports.getIO = getIO;
const emitToAll = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};
exports.emitToAll = emitToAll;
const emitToRole = (role, event, data) => {
    if (io) {
        io.to(`role_${role}`).to(role).emit(event, data);
    }
};
exports.emitToRole = emitToRole;
