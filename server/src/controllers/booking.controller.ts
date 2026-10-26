import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';
import { emitToAll, emitToRole } from '../socket';

// Helper: Calculate rate per hour for a station device type and controller count
const getHourlyRate = async (deviceType: string, controllerCount: number = 1): Promise<number> => {
  if (deviceType === 'PS5' || deviceType === 'PS4') {
    const rule = await prisma.pricingRule.findUnique({
      where: {
        deviceType_controllerCount: {
          deviceType,
          controllerCount: Math.min(Math.max(controllerCount, 1), 4),
        },
      },
    });
    if (rule) return rule.hourlyRate;
  } else {
    const rule = await prisma.pricingRule.findFirst({
      where: { deviceType },
    });
    if (rule) return rule.hourlyRate;
  }

  // Fallback defaults
  if (deviceType === 'PS5') return controllerCount === 2 ? 140 : 90;
  if (deviceType === 'PS4') return controllerCount === 2 ? 110 : 70;
  if (deviceType === 'CAR_SIMULATOR') return 100;
  return 70; // PC
};

export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { stationIds, startTime, endTime, excludeBookingId } = req.query;

    if (!stationIds || !startTime || !endTime) {
      return res.status(400).json({ error: 'stationIds, startTime, and endTime are required' });
    }

    const sIds = (stationIds as string).split(',').map((id) => parseInt(id, 10));
    const start = new Date(startTime as string);
    const end = new Date(endTime as string);

    const conflictingBookings = await prisma.bookingStation.findMany({
      where: {
        stationId: { in: sIds },
        booking: {
          id: excludeBookingId ? { not: excludeBookingId as string } : undefined,
          bookingStatus: { in: ['ACTIVE', 'UPCOMING'] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
      select: {
        stationId: true,
      },
    });

    const conflictingStationIds = Array.from(new Set(conflictingBookings.map((c) => c.stationId)));
    return res.json({
      data: {
        available: conflictingStationIds.length === 0,
        conflictingStationIds,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName,
      customerMobile,
      stationIds,
      controllerCount = 1,
      startTime,
      endTime,
      foodItems = [],
      discount = 0,
      notes,
    } = req.body;

    if (!customerName || !customerMobile || !stationIds || !stationIds.length || !startTime || !endTime) {
      return res.status(400).json({ error: 'Required booking fields missing' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0.5);

    // 1. Conflict Check
    const conflicts = await prisma.bookingStation.findMany({
      where: {
        stationId: { in: stationIds },
        booking: {
          bookingStatus: { in: ['ACTIVE', 'UPCOMING'] },
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
      include: { station: true },
    });

    if (conflicts.length > 0) {
      const conflictTables = conflicts.map((c) => `Table ${c.station.tableNumber}`).join(', ');
      return res.status(409).json({ error: `Conflict detected on ${conflictTables} for the requested time.` });
    }

    // 2. Fetch stations and calculate gaming total with historical rates
    const stations = await prisma.station.findMany({
      where: { id: { in: stationIds } },
    });

    let gamingTotal = 0;
    const stationRates: { stationId: number; appliedRatePerHour: number }[] = [];

    for (const st of stations) {
      const rate = await getHourlyRate(st.deviceType, controllerCount);
      stationRates.push({ stationId: st.id, appliedRatePerHour: rate });
      gamingTotal += rate * durationHours;
    }

    // 3. Calculate Food Total
    let foodTotal = 0;
    const bookingFoodData: { foodItemId: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

    if (foodItems.length > 0) {
      const foodItemIds = foodItems.map((f: any) => f.foodItemId);
      const dbFoodItems = await prisma.foodItem.findMany({
        where: { id: { in: foodItemIds } },
      });

      for (const item of foodItems) {
        const food = dbFoodItems.find((f) => f.id === item.foodItemId);
        if (food) {
          const itemTotal = food.price * item.quantity;
          foodTotal += itemTotal;
          bookingFoodData.push({
            foodItemId: food.id,
            quantity: item.quantity,
            unitPrice: food.price,
            totalPrice: itemTotal,
          });
        }
      }
    }

    const grandTotal = Math.max(gamingTotal + foodTotal - (discount || 0), 0);
    const bookingCode = `BC-${Math.floor(100000 + Math.random() * 900000)}`;

    // 4. Create Booking
    const newBooking = await prisma.booking.create({
      data: {
        bookingCode,
        customerName,
        customerMobile,
        controllerCount,
        startTime: start,
        endTime: end,
        gamingAmount: gamingTotal,
        foodAmount: foodTotal,
        discount: discount || 0,
        grandTotal,
        paymentStatus: 'UNPAID',
        bookingStatus: start <= new Date() ? 'ACTIVE' : 'UPCOMING',
        notes,
        createdById: req.user?.id,
        stations: {
          create: stationRates,
        },
        foodItems: {
          create: bookingFoodData,
        },
      },
      include: {
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: true,
      },
    });

    // Mark stations as OCCUPIED if booking starts now
    if (newBooking.bookingStatus === 'ACTIVE') {
      await prisma.station.updateMany({
        where: { id: { in: stationIds } },
        data: { status: 'OCCUPIED' },
      });
    }

    // Audit Log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'BOOKING_CREATE',
        target: bookingCode,
        newValue: `${customerName} - ₹${grandTotal} (${stations.map((s) => `T${s.tableNumber}`).join(', ')})`,
      });
    }

    emitToAll('booking_created', newBooking);
    emitToAll('booking.created', newBooking);
    emitToAll('station_updated', {});
    emitToAll('station.updated', {});

    return res.status(201).json({ data: newBooking });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, customerMobile, notes, discount, bookingStatus, paymentStatus } = req.body;

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });

    let grandTotal = existing.grandTotal;
    if (discount !== undefined) {
      grandTotal = Math.max(existing.gamingAmount + existing.foodAmount - parseFloat(discount || 0), 0);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...(customerName ? { customerName } : {}),
        ...(customerMobile ? { customerMobile } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(discount !== undefined ? { discount: parseFloat(discount || 0), grandTotal } : {}),
        ...(bookingStatus ? { bookingStatus } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      include: {
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: true,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'BOOKING_UPDATE',
        target: updated.bookingCode,
        newValue: `Updated details for ${updated.customerName}`,
      });
    }

    emitToAll('booking_updated', updated);
    emitToAll('booking.updated', updated);
    emitToAll('station_updated', {});
    emitToAll('station.updated', {});

    return res.json({ data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { status, date, paymentStatus, search } = req.query;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.bookingStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      where.paymentStatus = paymentStatus;
    }

    if (date === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.startTime = { gte: todayStart, lte: todayEnd };
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { customerName: { contains: q } },
        { customerMobile: { contains: q } },
        { bookingCode: { contains: q } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, employeeId: true, role: true },
        },
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: {
          include: {
            recordedBy: {
              select: { id: true, name: true, employeeId: true },
            },
          },
        },
      },
    });

    return res.json({ data: bookings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, employeeId: true, role: true },
        },
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: {
          include: {
            recordedBy: {
              select: { id: true, name: true, employeeId: true },
            },
          },
        },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json({ data: booking });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const extendSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { extendMinutes } = req.body;

    if (!extendMinutes || extendMinutes <= 0) {
      return res.status(400).json({ error: 'Valid extend duration in minutes is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { stations: { include: { station: true } }, foodItems: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const newEndTime = new Date(booking.endTime.getTime() + extendMinutes * 60 * 1000);
    const stationIds = booking.stations.map((s) => s.stationId);

    // Overlap conflict check for extension period
    const conflicts = await prisma.bookingStation.findMany({
      where: {
        stationId: { in: stationIds },
        booking: {
          id: { not: booking.id },
          bookingStatus: { in: ['ACTIVE', 'UPCOMING'] },
          startTime: { lt: newEndTime },
          endTime: { gt: booking.endTime },
        },
      },
      include: { station: true },
    });

    if (conflicts.length > 0) {
      const conflictTables = conflicts.map((c) => `Table ${c.station.tableNumber}`).join(', ');
      return res.status(409).json({
        error: `Cannot extend: Conflict on ${conflictTables} with an upcoming reservation.`,
      });
    }

    // Calculate additional gaming amount using historical rate snapshots
    const additionalHours = extendMinutes / 60;
    let additionalGaming = 0;
    for (const bs of booking.stations) {
      additionalGaming += bs.appliedRatePerHour * additionalHours;
    }

    const newGamingAmount = booking.gamingAmount + additionalGaming;
    const newGrandTotal = Math.max(newGamingAmount + booking.foodAmount - booking.discount, 0);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        endTime: newEndTime,
        gamingAmount: newGamingAmount,
        grandTotal: newGrandTotal,
        bookingStatus: 'ACTIVE',
      },
      include: {
        createdBy: {
          select: { id: true, name: true, employeeId: true, role: true },
        },
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: true,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'BOOKING_EXTEND',
        target: booking.bookingCode,
        newValue: `Extended by ${extendMinutes} mins (+₹${additionalGaming}). New End: ${newEndTime.toLocaleTimeString()}`,
      });
    }

    emitToAll('booking_updated', updated);
    emitToAll('booking.updated', updated);
    emitToAll('station_updated', {});
    emitToAll('station.updated', {});

    return res.json({ data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelReason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { stations: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        bookingStatus: 'CANCELLED',
        cancelReason: cancelReason || 'Cancelled by staff',
      },
      include: {
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: true,
      },
    });

    // Free up stations
    for (const bs of booking.stations) {
      await prisma.station.update({
        where: { id: bs.stationId },
        data: { status: 'AVAILABLE' },
      });
    }

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'BOOKING_CANCEL',
        target: booking.bookingCode,
        newValue: `Reason: ${cancelReason || 'None given'}`,
      });
    }

    emitToAll('booking_updated', updated);
    emitToAll('booking.updated', updated);
    emitToAll('booking.cancelled', updated);
    emitToAll('station_updated', {});
    emitToAll('station.updated', {});

    return res.json({ data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const addFoodToBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No food items specified' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { foodItems: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const foodItemIds = items.map((i: any) => i.foodItemId);
    const dbFoodItems = await prisma.foodItem.findMany({
      where: { id: { in: foodItemIds } },
    });

    let additionalFood = 0;
    for (const it of items) {
      const dbItem = dbFoodItems.find((f) => f.id === it.foodItemId);
      if (dbItem) {
        const itemTotal = dbItem.price * it.quantity;
        additionalFood += itemTotal;

        await prisma.bookingFoodItem.create({
          data: {
            bookingId: booking.id,
            foodItemId: dbItem.id,
            quantity: it.quantity,
            unitPrice: dbItem.price,
            totalPrice: itemTotal,
          },
        });
      }
    }

    const newFoodAmount = booking.foodAmount + additionalFood;
    const newGrandTotal = Math.max(booking.gamingAmount + newFoodAmount - booking.discount, 0);

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        foodAmount: newFoodAmount,
        grandTotal: newGrandTotal,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, employeeId: true, role: true },
        },
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: true,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'FOOD_ORDER_ADD',
        target: booking.bookingCode,
        newValue: `Added snacks (+₹${additionalFood}). Total Food: ₹${newFoodAmount}`,
      });
    }

    emitToAll('booking_updated', updated);
    emitToAll('booking.updated', updated);
    emitToAll('food.added', updated);

    return res.json({ data: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
