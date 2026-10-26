import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';
import { emitToAll } from '../socket';

export const getAllFood = async (req: Request, res: Response) => {
  try {
    const items = await prisma.foodItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return res.json({ data: items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createFood = async (req: AuthRequest, res: Response) => {
  try {
    const { name, category = 'SNACKS', price, isAvailable = true } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Food item name and price are required' });
    }

    const item = await prisma.foodItem.create({
      data: {
        name,
        category,
        price: parseFloat(price),
        isAvailable,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'FOOD_ITEM_CREATE',
        target: item.name,
        newValue: `₹${item.price} (${item.category})`,
      });
    }

    emitToAll('food_updated', item);
    emitToAll('food.added', item);
    return res.status(201).json({ data: item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateFood = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, price, isAvailable } = req.body;

    const existing = await prisma.foodItem.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Food item not found' });

    const item = await prisma.foodItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(price !== undefined ? { price: parseFloat(price) } : {}),
        ...(isAvailable !== undefined ? { isAvailable } : {}),
      },
    });

    if (req.user) {
      await createAuditLog({
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

    emitToAll('food_updated', item);
    emitToAll('food.added', item);
    return res.json({ data: item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteFood = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.foodItem.update({
      where: { id },
      data: { isAvailable: false },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'FOOD_ITEM_DISABLE',
        target: item.name,
        newValue: 'Marked unavailable',
      });
    }

    emitToAll('food_updated', item);
    emitToAll('food.added', item);
    return res.json({ message: 'Food item disabled successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
