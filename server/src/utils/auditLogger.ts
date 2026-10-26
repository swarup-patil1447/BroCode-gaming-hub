import { prisma } from './prisma';

export interface LogAuditParams {
  userId?: string;
  userName: string;
  userEmpId: string;
  role: string;
  action: string;
  target: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export const createAuditLog = async (params: LogAuditParams) => {
  try {
    return await prisma.auditLog.create({
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
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
};
