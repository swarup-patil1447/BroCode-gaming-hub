import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ data: employees });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, name, mobile, temporaryPassword } = req.body;

    if (!employeeId || !name || !mobile || !temporaryPassword) {
      return res.status(400).json({ error: 'All employee fields are required' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ employeeId }, { mobile }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Employee with this ID or mobile already exists' });
    }

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newEmp = await prisma.user.create({
      data: {
        employeeId,
        name,
        mobile,
        password: hashedPassword,
        role: 'EMPLOYEE',
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'EMPLOYEE_CREATE',
        target: newEmp.employeeId,
        newValue: `${newEmp.name} (${newEmp.mobile})`,
      });
    }

    return res.status(201).json({ data: newEmp });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, mobile, isActive } = req.body;

    const emp = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(mobile ? { mobile } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'EMPLOYEE_UPDATE',
        target: emp.employeeId,
        newValue: `Updated details (Active: ${emp.isActive})`,
      });
    }

    return res.json({ data: emp });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const resetEmployeePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const emp = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'EMPLOYEE_PASSWORD_RESET',
        target: emp.employeeId,
        newValue: 'Password reset by Owner',
      });
    }

    return res.json({ message: 'Password reset successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const emp = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'EMPLOYEE_DEACTIVATE',
        target: emp.employeeId,
        newValue: 'Deactivated staff account',
      });
    }

    return res.json({ message: 'Employee account deactivated' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
