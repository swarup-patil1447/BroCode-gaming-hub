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
    // 1. Authorization check
    if (!req.user || req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Unauthorized: Only owners are permitted to modify pricing' });
    }

    const { deviceType, controllerCount = 1, hourlyRate } = req.body;

    // 2. Validate deviceType
    if (!deviceType || typeof deviceType !== 'string' || !deviceType.trim()) {
      return res.status(400).json({ error: 'Device type is required' });
    }

    const trimmedDeviceType = deviceType.trim();

    // 3. Validate hourlyRate: Must be a valid number >= 0
    if (hourlyRate === undefined || hourlyRate === null || hourlyRate === '') {
      return res.status(400).json({ error: 'Hourly rate is required' });
    }

    const numRate = Number(hourlyRate);
    if (isNaN(numRate) || numRate < 0) {
      return res.status(400).json({ error: 'Hourly rate must be a valid number greater than or equal to 0' });
    }

    // 4. Validate controllerCount
    const parsedControllerCount = parseInt(String(controllerCount), 10) || 1;
    if (parsedControllerCount < 1 || parsedControllerCount > 4) {
      return res.status(400).json({ error: 'Controller count must be between 1 and 4' });
    }

    const isSimulator = trimmedDeviceType === 'CAR_SIMULATOR' || trimmedDeviceType === 'SIMULATOR';
    const canonicalDeviceType = isSimulator ? 'CAR_SIMULATOR' : trimmedDeviceType;
    const finalControllerCount = isSimulator ? 1 : parsedControllerCount;

    const { updated, oldRate } = await prisma.$transaction(async (tx) => {
      const existing = await tx.pricingRule.findUnique({
        where: {
          deviceType_controllerCount: {
            deviceType: canonicalDeviceType,
            controllerCount: finalControllerCount,
          },
        },
      });

      const canonicalRule = await tx.pricingRule.upsert({
        where: {
          deviceType_controllerCount: {
            deviceType: canonicalDeviceType,
            controllerCount: finalControllerCount,
          },
        },
        update: { hourlyRate: numRate },
        create: {
          deviceType: canonicalDeviceType,
          controllerCount: finalControllerCount,
          hourlyRate: numRate,
        },
      });

      if (isSimulator) {
        await tx.pricingRule.upsert({
          where: {
            deviceType_controllerCount: {
              deviceType: 'SIMULATOR',
              controllerCount: 1,
            },
          },
          update: { hourlyRate: numRate },
          create: {
            deviceType: 'SIMULATOR',
            controllerCount: 1,
            hourlyRate: numRate,
          },
        });

        // Normalize legacy station names in the same transaction as both price records.
        await tx.station.updateMany({
          where: {
            OR: [
              { id: { in: [5, 6] } },
              { tableNumber: { in: [5, 6] } },
              { deviceType: 'SIMULATOR' },
            ],
          },
          data: { deviceType: 'CAR_SIMULATOR' },
        });
      }

      return { updated: canonicalRule, oldRate: existing?.hourlyRate ?? null };
    });

    // 5. Audit Logging
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'PRICING_UPDATE',
        target: isSimulator ? 'Car Simulator' : `${canonicalDeviceType} (${finalControllerCount}P)`,
        oldValue: oldRate !== null ? (isSimulator ? `₹${oldRate} / 30m` : `₹${oldRate}/hr`) : 'None',
        newValue: isSimulator ? `₹${numRate} / 30m` : `₹${numRate}/hr`,
      });
    }

    emitToAll('pricing_updated', updated);
    emitToAll('pricing.updated', updated);
    return res.json({ data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
