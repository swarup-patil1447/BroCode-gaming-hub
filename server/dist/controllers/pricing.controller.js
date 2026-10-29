"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePricing = exports.getAllPricing = void 0;
const prisma_1 = require("../utils/prisma");
const auditLogger_1 = require("../utils/auditLogger");
const socket_1 = require("../socket");
const getAllPricing = async (req, res) => {
    try {
        const rules = await prisma_1.prisma.pricingRule.findMany({
            orderBy: [{ deviceType: 'asc' }, { controllerCount: 'asc' }],
        });
        return res.json({ data: rules });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllPricing = getAllPricing;
const updatePricing = async (req, res) => {
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
        // Find existing rule for oldRate calculation
        const existing = await prisma_1.prisma.pricingRule.findFirst({
            where: {
                deviceType: canonicalDeviceType,
                controllerCount: finalControllerCount,
            },
        });
        const oldRate = existing ? existing.hourlyRate : null;
        // Upsert canonical pricing rule
        const updated = await prisma_1.prisma.pricingRule.upsert({
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
        // If updating simulator, also synchronize legacy 'SIMULATOR' record and stations
        if (isSimulator) {
            try {
                await prisma_1.prisma.pricingRule.upsert({
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
                // Ensure stations 5 and 6 use CAR_SIMULATOR
                await prisma_1.prisma.station.updateMany({
                    where: { id: { in: [5, 6] } },
                    data: { deviceType: 'CAR_SIMULATOR' },
                });
            }
            catch (syncErr) {
                console.warn('Note: Simulator alias sync non-critical warning:', syncErr);
            }
        }
        // 5. Audit Logging
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
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
        (0, socket_1.emitToAll)('pricing_updated', updated);
        (0, socket_1.emitToAll)('pricing.updated', updated);
        return res.json({ data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updatePricing = updatePricing;
