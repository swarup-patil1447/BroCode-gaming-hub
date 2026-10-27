import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { createAuditLog } from '../utils/auditLogger';
import { sendSMS, devSmsLogs } from '../utils/smsService';
import { AuthRequest } from '../middlewares/auth';

// Password policy helper: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
export const validatePasswordPolicy = (password: string): boolean => {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpper && hasLower && hasNumber;
};

export const login = async (req: Request, res: Response) => {
  try {
    const { employeeId, password, expectedRole } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID/Username and password are required' });
    }

    const empIdTrimmed = String(employeeId).trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: { equals: empIdTrimmed } },
          { employeeId: { equals: empIdTrimmed.toUpperCase() } },
          { employeeId: { equals: empIdTrimmed.toLowerCase() } },
          { mobile: { equals: empIdTrimmed } },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact the cafe owner.' });
    }

    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({ error: `Account role mismatch: expected ${expectedRole}` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      id: user.id,
      employeeId: user.employeeId,
      role: user.role,
      name: user.name,
      tokenVersion: user.tokenVersion,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmpId: user.employeeId,
      role: user.role,
      action: 'LOGIN',
      target: 'AUTH',
      newValue: `Logged in successfully as ${user.role}`,
    });

    return res.json({
      data: {
        token,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          mobile: user.mobile,
          role: user.role,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
          passwordChangedAt: user.passwordChangedAt,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ data: user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Owner access required.' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (confirmPassword && confirmPassword !== newPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    if (!validatePasswordPolicy(newPassword)) {
      return res.status(400).json({
        error: 'Password does not meet the security requirements.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        tokenVersion: true,
      },
    });

    // Record safe audit log without passwords or secrets
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmpId: user.employeeId,
      role: user.role,
      action: 'PASSWORD_CHANGE',
      target: 'OWNER_ACCOUNT',
      oldValue: null,
      newValue: 'Owner password changed successfully',
    });

    // Generate refreshed token with new tokenVersion
    const newToken = generateToken({
      id: updatedUser.id,
      employeeId: updatedUser.employeeId,
      role: updatedUser.role,
      name: updatedUser.name,
      tokenVersion: updatedUser.tokenVersion,
    });

    return res.json({
      message: 'Password updated successfully',
      token: newToken,
      user: {
        id: updatedUser.id,
        employeeId: updatedUser.employeeId,
        name: updatedUser.name,
        mobile: updatedUser.mobile,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        mustChangePassword: updatedUser.mustChangePassword,
        passwordChangedAt: updatedUser.passwordChangedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const employeeChangePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (confirmPassword && confirmPassword !== newPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password does not meet minimum length requirements.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        tokenVersion: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmpId: user.employeeId,
      role: user.role,
      action: 'PASSWORD_CHANGE',
      target: 'EMPLOYEE_ACCOUNT',
      oldValue: null,
      newValue: 'Employee password changed successfully',
    });

    const newToken = generateToken({
      id: updatedUser.id,
      employeeId: updatedUser.employeeId,
      role: updatedUser.role,
      name: updatedUser.name,
      tokenVersion: updatedUser.tokenVersion,
    });

    return res.json({
      message: 'Password updated successfully',
      token: newToken,
      user: {
        id: updatedUser.id,
        employeeId: updatedUser.employeeId,
        name: updatedUser.name,
        mobile: updatedUser.mobile,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        mustChangePassword: updatedUser.mustChangePassword,
        passwordChangedAt: updatedUser.passwordChangedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { employeeIdOrMobile } = req.body;
    if (!employeeIdOrMobile) {
      return res.status(400).json({ error: 'Employee ID or mobile is required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: { equals: employeeIdOrMobile } },
          { mobile: { equals: employeeIdOrMobile } },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this ID or mobile' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetOTP.create({
      data: {
        employeeId: user.employeeId,
        otp,
        expiresAt,
      },
    });

    const maskedMobile = user.mobile.replace(/(\+\d{2})(\d{3})\d{4}(\d{3})/, '$1 $2****$3');
    await sendSMS(user.mobile, `Your BroCode password reset OTP is ${otp}. Valid for 10 minutes.`);

    return res.json({
      data: {
        employeeId: user.employeeId,
        mobileMasked: maskedMobile,
        devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const verifyOTPAndResetPassword = async (req: Request, res: Response) => {
  try {
    const { employeeId, otp, newPassword } = req.body;
    if (!employeeId || !otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid OTP and new password (min 6 chars) are required' });
    }

    const record = await prisma.passwordResetOTP.findFirst({
      where: {
        employeeId,
        otp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await prisma.passwordResetOTP.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { employeeId },
      data: { password: hashedPassword },
    });

    await createAuditLog({
      userId: updatedUser.id,
      userName: updatedUser.name,
      userEmpId: updatedUser.employeeId,
      role: updatedUser.role,
      action: 'PASSWORD_RESET_OTP',
      target: 'USER',
      newValue: 'Reset password via OTP',
    });

    return res.json({ message: 'Password reset successful' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getDevSMSLogs = async (req: Request, res: Response) => {
  return res.json({ data: devSmsLogs });
};
