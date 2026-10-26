"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAuditLogs = void 0;
const prisma_1 = require("../utils/prisma");
const getAllAuditLogs = async (req, res) => {
    try {
        const { action, search, page = '1', limit = '100' } = req.query;
        const where = {};
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
        const logs = await prisma_1.prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit, 10),
            skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        });
        return res.json({ data: logs });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllAuditLogs = getAllAuditLogs;
