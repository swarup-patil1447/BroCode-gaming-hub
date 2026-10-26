"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = void 0;
const prisma_1 = require("./prisma");
const createAuditLog = async (params) => {
    try {
        return await prisma_1.prisma.auditLog.create({
            data: {
                userId: params.userId,
                userName: params.userName,
                userEmpId: params.userEmpId,
                role: params.role,
                action: params.action,
                target: params.target,
                oldValue: params.oldValue || null,
                newValue: params.newValue || null,
            },
        });
    }
    catch (err) {
        console.error('Failed to create audit log:', err);
    }
};
exports.createAuditLog = createAuditLog;
