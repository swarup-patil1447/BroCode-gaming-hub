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
        const { deviceType, controllerCount = 1, hourlyRate } = req.body;
        if (!deviceType || hourlyRate === undefined) {
            return res.status(400).json({ error: 'Device type and hourly rate are required' });
        }
        const existing = await prisma_1.prisma.pricingRule.findFirst({
            where: {
                deviceType,
                controllerCount,
            },
        });
        const oldRate = existing ? existing.hourlyRate : null;
        const updated = await prisma_1.prisma.pricingRule.upsert({
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
            await (0, auditLogger_1.createAuditLog)({
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
        (0, socket_1.emitToAll)('pricing_updated', updated);
        (0, socket_1.emitToAll)('pricing.updated', updated);
        return res.json({ data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updatePricing = updatePricing;
