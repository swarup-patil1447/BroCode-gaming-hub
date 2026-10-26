"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getAllNotifications = void 0;
const prisma_1 = require("../utils/prisma");
const getAllNotifications = async (req, res) => {
    try {
        const role = req.user?.role || 'ALL';
        const notifs = await prisma_1.prisma.notification.findMany({
            where: {
                OR: [{ targetRole: 'ALL' }, { targetRole: role }],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const unreadCount = await prisma_1.prisma.notification.count({
            where: {
                OR: [{ targetRole: 'ALL' }, { targetRole: role }],
                isRead: false,
            },
        });
        return res.json({
            data: notifs,
            unreadCount,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllNotifications = getAllNotifications;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        return res.json({ message: 'Marked as read' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const role = req.user?.role || 'ALL';
        await prisma_1.prisma.notification.updateMany({
            where: {
                OR: [{ targetRole: 'ALL' }, { targetRole: role }],
                isRead: false,
            },
            data: { isRead: true },
        });
        return res.json({ message: 'All marked as read' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.markAllAsRead = markAllAsRead;
