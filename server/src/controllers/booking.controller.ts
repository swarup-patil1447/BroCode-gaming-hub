import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';
import { emitToAll, emitToRole } from '../socket';
import { getPricingRuleForStation, StationPricingDetails } from '../utils/pricingSync';

// Helper: Calculate rate per hour or 30-min unit for a station device type and controller count
export const getHourlyRate = async (deviceType: string, controllerCount: number = 1): Promise<number> => {
  const details = await getPricingRuleForStation(deviceType, controllerCount);
  return details.configuredRate;
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
    const durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / (1000 * 60)), 30);
    const durationHours = durationMinutes / 60;

    // 1. Resolve selected stations and check availability across their whole table.
    const stations = await prisma.station.findMany({
      where: { id: { in: stationIds } },
    });
    if (stations.length !== new Set(stationIds).size) {
      return res.status(400).json({ error: 'One or more selected consoles were not found' });
    }

    const tableNumbers = Array.from(new Set(stations.map((station) => station.tableNumber)));
    const tableStations = await prisma.station.findMany({
      where: { tableNumber: { in: tableNumbers } },
      select: { id: true },
    });

    const conflicts = await prisma.bookingStation.findMany({
      where: {
        stationId: { in: tableStations.map((station) => station.id) },
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

    // 2. Calculate gaming total using the configured database prices.
    let gamingTotal = 0;
    const stationRates: { stationId: number; appliedRatePerHour: number }[] = [];

    for (const st of stations) {
      const pricingDetails = await getPricingRuleForStation(st.deviceType, controllerCount);
      const isSim = pricingDetails.isSimulator;
      const rate = pricingDetails.configuredRate;
      const stationGaming = isSim
        ? rate * (durationMinutes / 30)
        : rate * (durationMinutes / 60);
      const appliedRatePerHour = pricingDetails.appliedRatePerHour;

      stationRates.push({ stationId: st.id, appliedRatePerHour });
      gamingTotal += stationGaming;

      // Safe Diagnostic Log per station (never log sensitive user data)
      console.log('[BOOKING_PRICING_DEBUG]', {
        timestamp: new Date().toISOString(),
        selectedDeviceId: st.id,
        selectedDeviceName: `Table ${st.tableNumber} (${st.deviceType})`,
        tableNumber: st.tableNumber,
        deviceType: st.deviceType,
        retrievedPricingRecordId: pricingDetails.ruleId,
        retrievedPricingDeviceType: pricingDetails.matchedRuleDeviceType,
        retrievedConfiguredPrice: rate,
        billingUnit: pricingDetails.billingUnit,
        bookingDurationMinutes: durationMinutes,
        calculatedStationGamingAmount: stationGaming,
        appliedRatePerHour,
      });
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

    // Safe Diagnostic Log for final saved booking
    console.log('[BOOKING_CREATION_SAVED]', {
      timestamp: new Date().toISOString(),
      bookingId: newBooking.id,
      bookingCode: newBooking.bookingCode,
      totalStations: stations.length,
      bookingDurationMinutes: durationMinutes,
      calculatedGamingTotal: gamingTotal,
      foodTotal,
      discount: discount || 0,
      calculatedGrandTotal: grandTotal,
      finalAmountSavedInDatabase: newBooking.grandTotal,
      savedGamingAmount: newBooking.gamingAmount,
      savedStationRates: newBooking.stations.map((s) => ({
        stationId: s.stationId,
        appliedRatePerHour: s.appliedRatePerHour,
      })),
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

    // Re-check payments vs newGrandTotal
    const allPayments = await prisma.payment.findMany({ where: { bookingId: booking.id } });
    const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
    let paymentStatus = booking.paymentStatus;
    if (totalPaid >= newGrandTotal) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'UNPAID';
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        endTime: newEndTime,
        gamingAmount: newGamingAmount,
        grandTotal: newGrandTotal,
        bookingStatus: 'ACTIVE',
        paymentStatus,
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

export const addConsoleToBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stationId, controllerCount = 1 } = req.body;

    if (!stationId) {
      return res.status(400).json({ error: 'Station ID is required' });
    }

    const sId = parseInt(String(stationId), 10);
    if (isNaN(sId)) {
      return res.status(400).json({ error: 'Valid station ID is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        stations: { include: { station: true } },
        payments: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot add a console to a cancelled booking' });
    }

    if (booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot add a console to a completed booking' });
    }

    const now = new Date();
    if (now >= booking.endTime) {
      return res.status(400).json({ error: 'Booking session has already ended' });
    }

    // Check if station is already attached to this booking
    const alreadyAttached = booking.stations.some((bs) => bs.stationId === sId);
    if (alreadyAttached) {
      return res.status(400).json({ error: `Station Table ${sId} is already part of this booking` });
    }

    const bookingTableNumber = booking.stations[0]?.station.tableNumber;
    if (bookingTableNumber === undefined) {
      return res.status(400).json({ error: 'Booking has no table assigned' });
    }

    const targetStation = await prisma.station.findUnique({
      where: { id: sId },
    });

    if (!targetStation) {
      return res.status(404).json({ error: 'Station not found' });
    }

    if (targetStation.tableNumber !== bookingTableNumber) {
      return res.status(400).json({ error: `Additional consoles must be assigned to Table ${bookingTableNumber}` });
    }

    if (targetStation.status === 'MAINTENANCE') {
      return res.status(409).json({ error: `Table ${targetStation.tableNumber} is currently under maintenance` });
    }

    // Overlap conflict check for the remaining duration
    const effectiveStart = now > booking.startTime ? now : booking.startTime;
    const effectiveEnd = booking.endTime;

    const sameTableStations = await prisma.station.findMany({
      where: { tableNumber: bookingTableNumber },
      select: { id: true },
    });
    const sameTableStationIds = sameTableStations.map((station) => station.id);

    const conflicts = await prisma.bookingStation.findMany({
      where: {
        stationId: { in: sameTableStationIds },
        booking: {
          id: { not: booking.id },
          bookingStatus: { in: ['ACTIVE', 'UPCOMING'] },
          startTime: { lt: effectiveEnd },
          endTime: { gt: effectiveStart },
        },
      },
      include: {
        station: true,
        booking: true,
      },
    });

    if (targetStation.status === 'OCCUPIED' && effectiveStart <= now) {
      return res.status(409).json({ error: `Table ${targetStation.tableNumber} console is currently occupied` });
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: `Table ${targetStation.tableNumber} is not available during this time slot (conflict detected with ${conflicts[0].booking.bookingCode}).`,
      });
    }

    // Calculate remaining duration
    const remainingMs = effectiveEnd.getTime() - effectiveStart.getTime();
    const remainingMinutes = Math.max(Math.ceil(remainingMs / (1000 * 60)), 1);

    const pricingDetails = await getPricingRuleForStation(targetStation.deviceType, controllerCount);
    const isSim = pricingDetails.isSimulator;
    const rate = pricingDetails.configuredRate;

    let additionalGaming = 0;
    const appliedRatePerHour = pricingDetails.appliedRatePerHour;

    if (isSim) {
      additionalGaming = Math.round(rate * (remainingMinutes / 30));
    } else {
      additionalGaming = Math.round((rate * remainingMinutes) / 60);
    }

    additionalGaming = Math.max(0, additionalGaming);

    console.log('[BOOKING_ADD_CONSOLE_DEBUG]', {
      timestamp: new Date().toISOString(),
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      addedStationId: targetStation.id,
      addedTableNumber: targetStation.tableNumber,
      addedDeviceType: targetStation.deviceType,
      retrievedPricingRecordId: pricingDetails.ruleId,
      retrievedConfiguredPrice: rate,
      remainingMinutes,
      additionalGaming,
      appliedRatePerHour,
    });

    const newGamingAmount = booking.gamingAmount + additionalGaming;
    const newGrandTotal = Math.max(0, newGamingAmount + booking.foodAmount - booking.discount);

    // Re-evaluate payment status
    const totalPaid = booking.payments.reduce((acc, p) => acc + p.amount, 0);
    let newPaymentStatus = 'UNPAID';
    if (totalPaid >= newGrandTotal) {
      newPaymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      newPaymentStatus = 'PARTIAL';
    } else {
      newPaymentStatus = 'UNPAID';
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.bookingStation.create({
        data: {
          bookingId: booking.id,
          stationId: targetStation.id,
          appliedRatePerHour,
        },
      });

      if (booking.bookingStatus === 'ACTIVE') {
        await tx.station.update({
          where: { id: targetStation.id },
          data: { status: 'OCCUPIED' },
        });
      }

      return await tx.booking.update({
        where: { id: booking.id },
        data: {
          gamingAmount: newGamingAmount,
          grandTotal: newGrandTotal,
          paymentStatus: newPaymentStatus,
        },
        include: {
          createdBy: { select: { id: true, name: true, employeeId: true, role: true } },
          stations: { include: { station: true } },
          foodItems: { include: { foodItem: true } },
          payments: {
            include: {
              recordedBy: { select: { id: true, name: true, employeeId: true } },
            },
          },
        },
      });
    }, { isolationLevel: 'Serializable' });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'BOOKING_ADD_CONSOLE',
        target: booking.bookingCode,
        newValue: `Added Table ${targetStation.tableNumber} (${targetStation.deviceType}) for remaining ${remainingMinutes}m (+₹${additionalGaming}). New Total: ₹${newGrandTotal}`,
      });
    }

    emitToAll('booking_updated', updated);
    emitToAll('booking.updated', updated);
    emitToAll('station_updated', {});
    emitToAll('station.updated', {});

    return res.status(200).json({
      data: updated,
      addedStation: {
        stationId: targetStation.id,
        tableNumber: targetStation.tableNumber,
        deviceType: targetStation.deviceType,
        remainingMinutes,
        additionalCharge: additionalGaming,
        rate,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

