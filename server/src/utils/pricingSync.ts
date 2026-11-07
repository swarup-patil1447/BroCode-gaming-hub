import { prisma } from './prisma';

export interface StationPricingDetails {
  ruleId: string | null;
  queriedDeviceType: string;
  matchedRuleDeviceType: string;
  configuredRate: number;
  billingUnit: 'per_30_min' | 'per_60_min';
  isSimulator: boolean;
  appliedRatePerHour: number;
}

/**
 * Ensures stations and pricing rules for car simulators are properly synchronized in the database.
 * Resolves legacy discrepancies between 'SIMULATOR' and 'CAR_SIMULATOR'.
 */
export async function syncDatabasePricing(): Promise<void> {
  try {
    // 1. Harmonize Stations 5 & 6 and any legacy 'SIMULATOR' stations to 'CAR_SIMULATOR'
    const stationUpdate = await prisma.station.updateMany({
      where: {
        OR: [
          { id: { in: [5, 6] } },
          { tableNumber: { in: [5, 6] } },
          { deviceType: 'SIMULATOR' },
        ],
      },
      data: { deviceType: 'CAR_SIMULATOR' },
    });
    if (stationUpdate.count > 0) {
      console.log(`[PRICING-SYNC] Updated ${stationUpdate.count} station(s) to canonical 'CAR_SIMULATOR'`);
    }

    // 2. Query existing simulator pricing rules
    const simRules = await prisma.pricingRule.findMany({
      where: {
        deviceType: { in: ['CAR_SIMULATOR', 'SIMULATOR'] },
      },
    });

    const carSimRule = simRules.find((r) => r.deviceType === 'CAR_SIMULATOR');
    const legacySimRule = simRules.find((r) => r.deviceType === 'SIMULATOR');

    console.log('[PRICING-SYNC] Existing simulator pricing rules in DB:', simRules.map((r) => ({
      id: r.id,
      deviceType: r.deviceType,
      hourlyRate: r.hourlyRate,
      updatedAt: r.updatedAt,
    })));

    // Determine target rate:
    // If CAR_SIMULATOR exists and has a valid rate (> 0), that is the source of truth set by the owner.
    // If only legacy SIMULATOR exists, use that rate (or default to 80 if invalid).
    let targetRate = 80;
    if (carSimRule && carSimRule.hourlyRate > 0) {
      targetRate = carSimRule.hourlyRate;
    } else if (legacySimRule && legacySimRule.hourlyRate > 0) {
      targetRate = legacySimRule.hourlyRate;
    }

    // 3. Upsert canonical CAR_SIMULATOR rule
    await prisma.pricingRule.upsert({
      where: {
        deviceType_controllerCount: {
          deviceType: 'CAR_SIMULATOR',
          controllerCount: 1,
        },
      },
      update: { hourlyRate: targetRate },
      create: {
        deviceType: 'CAR_SIMULATOR',
        controllerCount: 1,
        hourlyRate: targetRate,
      },
    });

    // 4. Mirror to legacy SIMULATOR rule so any queries searching 'SIMULATOR' find the identical rate
    await prisma.pricingRule.upsert({
      where: {
        deviceType_controllerCount: {
          deviceType: 'SIMULATOR',
          controllerCount: 1,
        },
      },
      update: { hourlyRate: targetRate },
      create: {
        deviceType: 'SIMULATOR',
        controllerCount: 1,
        hourlyRate: targetRate,
      },
    });

    console.log(`[PRICING-SYNC] Successfully synchronized simulator rates to ₹${targetRate} (per 30 min)`);
  } catch (err) {
    console.warn('[PRICING-SYNC] Non-critical warning during startup pricing sync:', err);
  }
}

/**
 * Retrieve station pricing details with exact rule ID and calculation parameters.
 * Canonical CAR_SIMULATOR is prioritized for simulators.
 */
export async function getPricingRuleForStation(
  deviceType: string,
  controllerCount: number = 1
): Promise<StationPricingDetails> {
  const norm = (deviceType || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
  const isConsole = norm === 'PS5' || norm === 'PS4';
  const isSim = norm === 'CAR_SIMULATOR' || norm === 'SIMULATOR';

  if (isConsole) {
    const clampedControllers = Math.min(Math.max(controllerCount, 1), 4);
    const rule = await prisma.pricingRule.findUnique({
      where: {
        deviceType_controllerCount: {
          deviceType: norm,
          controllerCount: clampedControllers,
        },
      },
    });

    const fallbackRate =
      norm === 'PS5'
        ? clampedControllers === 2
          ? 140
          : clampedControllers === 3
          ? 190
          : clampedControllers === 4
          ? 240
          : 90
        : clampedControllers === 2
        ? 110
        : clampedControllers === 3
        ? 150
        : clampedControllers === 4
        ? 190
        : 70;

    const rate = rule ? rule.hourlyRate : fallbackRate;
    return {
      ruleId: rule?.id || null,
      queriedDeviceType: deviceType,
      matchedRuleDeviceType: rule?.deviceType || `${norm}_FALLBACK`,
      configuredRate: rate,
      billingUnit: 'per_60_min',
      isSimulator: false,
      appliedRatePerHour: rate,
    };
  }

  if (isSim) {
    // Prioritize canonical CAR_SIMULATOR rule
    let rule = await prisma.pricingRule.findUnique({
      where: {
        deviceType_controllerCount: {
          deviceType: 'CAR_SIMULATOR',
          controllerCount: 1,
        },
      },
    });

    // If not found, check legacy SIMULATOR rule
    if (!rule) {
      rule = await prisma.pricingRule.findUnique({
        where: {
          deviceType_controllerCount: {
            deviceType: 'SIMULATOR',
            controllerCount: 1,
          },
        },
      });
    }

    if (!rule) {
      throw new Error(`No pricing rule configured for ${deviceType}`);
    }

    const rate = rule.hourlyRate;
    return {
      ruleId: rule?.id || null,
      queriedDeviceType: deviceType,
      matchedRuleDeviceType: rule?.deviceType || 'SIMULATOR_DEFAULT',
      configuredRate: rate,
      billingUnit: 'per_30_min',
      isSimulator: true,
      appliedRatePerHour: rate * 2, // e.g. 80 per 30m = 160/hr
    };
  }

  // Gaming PC or other device
  const rule = await prisma.pricingRule.findFirst({
    where: { deviceType: norm, controllerCount: 1 },
    orderBy: { updatedAt: 'desc' },
  });

  const rate = rule ? rule.hourlyRate : 70;
  return {
    ruleId: rule?.id || null,
    queriedDeviceType: deviceType,
    matchedRuleDeviceType: rule?.deviceType || 'PC_FALLBACK',
    configuredRate: rate,
    billingUnit: 'per_60_min',
    isSimulator: false,
    appliedRatePerHour: rate,
  };
}
