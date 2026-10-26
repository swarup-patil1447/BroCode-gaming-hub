"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToRole = exports.emitToAll = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: config_1.CONFIG.CORS_ORIGIN === '*' ? true : [config_1.CONFIG.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
