"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFood = exports.updateFood = exports.createFood = exports.getAllFood = void 0;
const prisma_1 = require("../utils/prisma");
const auditLogger_1 = require("../utils/auditLogger");
const socket_1 = require("../socket");
const getAllFood = async (req, res) => {
    try {
        const items = await prisma_1.prisma.foodItem.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        return res.json({ data: items });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllFood = getAllFood;
const createFood = async (req, res) => {
    try {
        const { name, category = 'SNACKS', price, isAvailable = true } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Food item name and price are required' });
        }
        const item = await prisma_1.prisma.foodItem.create({
            data: {
                name,
                category,
                price: parseFloat(price),
                isAvailable,
            },
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'FOOD_ITEM_CREATE',
                target: item.name,
                newValue: `₹${item.price} (${item.category})`,
            });
        }
        (0, socket_1.emitToAll)('food_updated', item);
        (0, socket_1.emitToAll)('food.added', item);
        return res.status(201).json({ data: item });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createFood = createFood;
const updateFood = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, isAvailable } = req.body;
        const existing = await prisma_1.prisma.foodItem.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Food item not found' });
        const item = await prisma_1.prisma.foodItem.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(category !== undefined ? { category } : {}),
                ...(price !== undefined ? { price: parseFloat(price) } : {}),
                ...(isAvailable !== undefined ? { isAvailable } : {}),
            },
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'FOOD_ITEM_UPDATE',
                target: item.name,
                oldValue: `₹${existing.price}`,
                newValue: `₹${item.price}`,
            });
        }
        (0, socket_1.emitToAll)('food_updated', item);
        (0, socket_1.emitToAll)('food.added', item);
        return res.json({ data: item });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updateFood = updateFood;
const deleteFood = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await prisma_1.prisma.foodItem.update({
            where: { id },
            data: { isAvailable: false },
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'FOOD_ITEM_DISABLE',
                target: item.name,
                newValue: 'Marked unavailable',
            });
        }
        (0, socket_1.emitToAll)('food_updated', item);
        (0, socket_1.emitToAll)('food.added', item);
        return res.json({ message: 'Food item disabled successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.deleteFood = deleteFood;
