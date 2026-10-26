"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.resetEmployeePassword = exports.updateEmployee = exports.createEmployee = exports.getAllEmployees = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const auditLogger_1 = require("../utils/auditLogger");
const getAllEmployees = async (req, res) => {
    try {
        const employees = await prisma_1.prisma.user.findMany({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllEmployees = getAllEmployees;
const createEmployee = async (req, res) => {
    try {
        const { employeeId, name, mobile, temporaryPassword } = req.body;
        if (!employeeId || !name || !mobile || !temporaryPassword) {
            return res.status(400).json({ error: 'All employee fields are required' });
        }
        const existing = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ employeeId }, { mobile }],
            },
        });
        if (existing) {
            return res.status(400).json({ error: 'Employee with this ID or mobile already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 10);
        const newEmp = await prisma_1.prisma.user.create({
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
            await (0, auditLogger_1.createAuditLog)({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createEmployee = createEmployee;
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mobile, isActive } = req.body;
        const emp = await prisma_1.prisma.user.update({
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
            await (0, auditLogger_1.createAuditLog)({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updateEmployee = updateEmployee;
const resetEmployeePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        const emp = await prisma_1.prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.resetEmployeePassword = resetEmployeePassword;
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const emp = await prisma_1.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.deleteEmployee = deleteEmployee;
