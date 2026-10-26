import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';

export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role || 'ALL';
    const notifs = await prisma.notification.findMany({
      where: {
        OR: [{ targetRole: 'ALL' }, { targetRole: role }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        OR: [{ targetRole: 'ALL' }, { targetRole: role }],
        isRead: false,
      },
    });

    return res.json({
      data: notifs,
      unreadCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json({ message: 'Marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role || 'ALL';
    await prisma.notification.updateMany({
      where: {
        OR: [{ targetRole: 'ALL' }, { targetRole: role }],
        isRead: false,
      },
      data: { isRead: true },
    });
    return res.json({ message: 'All marked as read' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
