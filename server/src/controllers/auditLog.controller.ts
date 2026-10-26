import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getAllAuditLogs = async (req: Request, res: Response) => {
  try {
    const { action, search, page = '1', limit = '100' } = req.query;

    const where: any = {};
    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { userName: { contains: q } },
        { userEmpId: { contains: q } },
        { action: { contains: q } },
        { target: { contains: q } },
        { newValue: { contains: q } },
        { oldValue: { contains: q } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string, 10),
      skip: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
    });

    return res.json({ data: logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
