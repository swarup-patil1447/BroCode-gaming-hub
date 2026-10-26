import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';
import { emitToAll } from '../socket';

export const getAllPricing = async (req: Request, res: Response) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      orderBy: [{ deviceType: 'asc' }, { controllerCount: 'asc' }],
    });
    return res.json({ data: rules });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updatePricing = async (req: AuthRequest, res: Response) => {
  try {
    const { deviceType, controllerCount = 1, hourlyRate } = req.body;

    if (!deviceType || hourlyRate === undefined) {
      return res.status(400).json({ error: 'Device type and hourly rate are required' });
    }

    const existing = await prisma.pricingRule.findFirst({
      where: {
        deviceType,
        controllerCount,
      },
    });

    const oldRate = existing ? existing.hourlyRate : null;

    const updated = await prisma.pricingRule.upsert({
      where: {
        deviceType_controllerCount: {
          deviceType,
          controllerCount,
        },
      },
      update: { hourlyRate: parseFloat(hourlyRate) },
      create: {
        deviceType,
        controllerCount,
        hourlyRate: parseFloat(hourlyRate),
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'PRICING_UPDATE',
        target: `${deviceType} (${controllerCount}P)`,
        oldValue: oldRate ? `₹${oldRate}/hr` : 'None',
        newValue: `₹${hourlyRate}/hr`,
      });
    }

    emitToAll('pricing_updated', updated);
    emitToAll('pricing.updated', updated);
    return res.json({ data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
