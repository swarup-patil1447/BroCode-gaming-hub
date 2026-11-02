"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addConsoleToBooking = exports.addFoodToBooking = exports.cancelBooking = exports.extendSession = exports.getBookingById = exports.getAllBookings = exports.updateBooking = exports.createBooking = exports.checkAvailability = exports.getHourlyRate = void 0;
const prisma_1 = require("../utils/prisma");
const auditLogger_1 = require("../utils/auditLogger");
const socket_1 = require("../socket");
// Helper: Calculate rate per hour for a station device type and controller count
const getHourlyRate = async (deviceType, controllerCount = 1) => {
    const norm = (deviceType || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
    const isConsole = norm === 'PS5' || norm === 'PS4';
    const isSim = norm === 'CAR_SIMULATOR' || norm === 'SIMULATOR';
    if (isConsole) {
        const rule = await prisma_1.prisma.pricingRule.findUnique({
            where: {
                deviceType_controllerCount: {
                    deviceType: norm,
                    controllerCount: Math.min(Math.max(controllerCount, 1), 4),
                },
            },
        });
        if (rule)
            return rule.hourlyRate;
    }
    else if (isSim) {
        const rule = await prisma_1.prisma.pricingRule.findFirst({
            where: {
                deviceType: { in: ['CAR_SIMULATOR', 'SIMULATOR'] },
            },
            orderBy: { updatedAt: 'desc' },
        });
        if (rule)
            return rule.hourlyRate;
    }
    else {
        const rule = await prisma_1.prisma.pricingRule.findFirst({
            where: { deviceType: norm },
            orderBy: { updatedAt: 'desc' },
        });
        if (rule)
            return rule.hourlyRate;
    }
    // Fallback defaults
    if (norm === 'PS5')
        return controllerCount === 2 ? 140 : 90;
    if (norm === 'PS4')
        return controllerCount === 2 ? 110 : 70;
    if (isSim)
        return 80;
    return 70; // PC
};
exports.getHourlyRate = getHourlyRate;
const checkAvailability = async (req, res) => {
    try {
        const { stationIds, startTime, endTime, excludeBookingId } = req.query;
        if (!stationIds || !startTime || !endTime) {
            return res.status(400).json({ error: 'stationIds, startTime, and endTime are required' });
        }
        const sIds = stationIds.split(',').map((id) => parseInt(id, 10));
        const start = new Date(startTime);
        const end = new Date(endTime);
        const conflictingBookings = await prisma_1.prisma.bookingStation.findMany({
            where: {
                stationId: { in: sIds },
                booking: {
                    id: excludeBookingId ? { not: excludeBookingId } : undefined,
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.checkAvailability = checkAvailability;
const createBooking = async (req, res) => {
    try {
        const { customerName, customerMobile, stationIds, controllerCount = 1, startTime, endTime, foodItems = [], discount = 0, notes, } = req.body;
        if (!customerName || !customerMobile || !stationIds || !stationIds.length || !startTime || !endTime) {
            return res.status(400).json({ error: 'Required booking fields missing' });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        const durationMinutes = Math.max(Math.round((end.getTime() - start.getTime()) / (1000 * 60)), 30);
        const durationHours = durationMinutes / 60;
        // 1. Conflict Check
        const conflicts = await prisma_1.prisma.bookingStation.findMany({
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
        // 2. Fetch stations and calculate gaming total with dynamic rates
        const stations = await prisma_1.prisma.station.findMany({
            where: { id: { in: stationIds } },
        });
        let gamingTotal = 0;
        const stationRates = [];
        for (const st of stations) {
            const isSim = st.deviceType === 'CAR_SIMULATOR' || st.deviceType === 'SIMULATOR';
            const rate = await (0, exports.getHourlyRate)(st.deviceType, controllerCount);
            const stationGaming = isSim
                ? rate * (durationMinutes / 30)
                : rate * (durationMinutes / 60);
            const appliedRatePerHour = isSim ? rate * 2 : rate;
            stationRates.push({ stationId: st.id, appliedRatePerHour });
            gamingTotal += stationGaming;
        }
        // 3. Calculate Food Total
        let foodTotal = 0;
        const bookingFoodData = [];
        if (foodItems.length > 0) {
            const foodItemIds = foodItems.map((f) => f.foodItemId);
            const dbFoodItems = await prisma_1.prisma.foodItem.findMany({
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
        const newBooking = await prisma_1.prisma.booking.create({
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
            await prisma_1.prisma.station.updateMany({
                where: { id: { in: stationIds } },
                data: { status: 'OCCUPIED' },
            });
        }
        // Audit Log
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'BOOKING_CREATE',
                target: bookingCode,
                newValue: `${customerName} - ₹${grandTotal} (${stations.map((s) => `T${s.tableNumber}`).join(', ')})`,
            });
        }
        (0, socket_1.emitToAll)('booking_created', newBooking);
        (0, socket_1.emitToAll)('booking.created', newBooking);
        (0, socket_1.emitToAll)('station_updated', {});
        (0, socket_1.emitToAll)('station.updated', {});
        return res.status(201).json({ data: newBooking });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createBooking = createBooking;
const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, customerMobile, notes, discount, bookingStatus, paymentStatus } = req.body;
        const existing = await prisma_1.prisma.booking.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Booking not found' });
        let grandTotal = existing.grandTotal;
        if (discount !== undefined) {
            grandTotal = Math.max(existing.gamingAmount + existing.foodAmount - parseFloat(discount || 0), 0);
        }
        const updated = await prisma_1.prisma.booking.update({
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
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'BOOKING_UPDATE',
                target: updated.bookingCode,
                newValue: `Updated details for ${updated.customerName}`,
            });
        }
        (0, socket_1.emitToAll)('booking_updated', updated);
        (0, socket_1.emitToAll)('booking.updated', updated);
        (0, socket_1.emitToAll)('station_updated', {});
        (0, socket_1.emitToAll)('station.updated', {});
        return res.json({ data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updateBooking = updateBooking;
const getAllBookings = async (req, res) => {
    try {
        const { status, date, paymentStatus, search } = req.query;
        const where = {};
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
        const bookings = await prisma_1.prisma.booking.findMany({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllBookings = getAllBookings;
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await prisma_1.prisma.booking.findUnique({
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
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        return res.json({ data: booking });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getBookingById = getBookingById;
const extendSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { extendMinutes } = req.body;
        if (!extendMinutes || extendMinutes <= 0) {
            return res.status(400).json({ error: 'Valid extend duration in minutes is required' });
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id },
            include: { stations: { include: { station: true } }, foodItems: true },
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        const newEndTime = new Date(booking.endTime.getTime() + extendMinutes * 60 * 1000);
        const stationIds = booking.stations.map((s) => s.stationId);
        // Overlap conflict check for extension period
        const conflicts = await prisma_1.prisma.bookingStation.findMany({
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
        const allPayments = await prisma_1.prisma.payment.findMany({ where: { bookingId: booking.id } });
        const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
        let paymentStatus = booking.paymentStatus;
        if (totalPaid >= newGrandTotal) {
            paymentStatus = 'PAID';
        }
        else if (totalPaid > 0) {
            paymentStatus = 'PARTIAL';
        }
        else {
            paymentStatus = 'UNPAID';
        }
        const updated = await prisma_1.prisma.booking.update({
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
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'BOOKING_EXTEND',
                target: booking.bookingCode,
                newValue: `Extended by ${extendMinutes} mins (+₹${additionalGaming}). New End: ${newEndTime.toLocaleTimeString()}`,
            });
        }
        (0, socket_1.emitToAll)('booking_updated', updated);
        (0, socket_1.emitToAll)('booking.updated', updated);
        (0, socket_1.emitToAll)('station_updated', {});
        (0, socket_1.emitToAll)('station.updated', {});
        return res.json({ data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.extendSession = extendSession;
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body;
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id },
            include: { stations: true },
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        const updated = await prisma_1.prisma.booking.update({
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
            await prisma_1.prisma.station.update({
                where: { id: bs.stationId },
                data: { status: 'AVAILABLE' },
            });
        }
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'BOOKING_CANCEL',
                target: booking.bookingCode,
                newValue: `Reason: ${cancelReason || 'None given'}`,
            });
        }
        (0, socket_1.emitToAll)('booking_updated', updated);
        (0, socket_1.emitToAll)('booking.updated', updated);
        (0, socket_1.emitToAll)('booking.cancelled', updated);
        (0, socket_1.emitToAll)('station_updated', {});
        (0, socket_1.emitToAll)('station.updated', {});
        return res.json({ data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.cancelBooking = cancelBooking;
const addFoodToBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body;
        if (!items || !items.length) {
            return res.status(400).json({ error: 'No food items specified' });
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id },
            include: { foodItems: true },
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        const foodItemIds = items.map((i) => i.foodItemId);
        const dbFoodItems = await prisma_1.prisma.foodItem.findMany({
            where: { id: { in: foodItemIds } },
        });
        let additionalFood = 0;
        for (const it of items) {
            const dbItem = dbFoodItems.find((f) => f.id === it.foodItemId);
            if (dbItem) {
                const itemTotal = dbItem.price * it.quantity;
                additionalFood += itemTotal;
                await prisma_1.prisma.bookingFoodItem.create({
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
        const updated = await prisma_1.prisma.booking.update({
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
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'FOOD_ORDER_ADD',
                target: booking.bookingCode,
                newValue: `Added snacks (+₹${additionalFood}). Total Food: ₹${newFoodAmount}`,
            });
        }
        (0, socket_1.emitToAll)('booking_updated', updated);
        (0, socket_1.emitToAll)('booking.updated', updated);
        (0, socket_1.emitToAll)('food.added', updated);
        return res.json({ data: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.addFoodToBooking = addFoodToBooking;
const addConsoleToBooking = async (req, res) => {
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
        const booking = await prisma_1.prisma.booking.findUnique({
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
        const targetStation = await prisma_1.prisma.station.findUnique({
            where: { id: sId },
        });
        if (!targetStation) {
            return res.status(404).json({ error: 'Station not found' });
        }
        if (targetStation.status === 'MAINTENANCE') {
            return res.status(409).json({ error: `Table ${targetStation.tableNumber} is currently under maintenance` });
        }
        // Overlap conflict check for the remaining duration
        const effectiveStart = now > booking.startTime ? now : booking.startTime;
        const effectiveEnd = booking.endTime;
        const conflicts = await prisma_1.prisma.bookingStation.findMany({
            where: {
                stationId: sId,
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
        if (conflicts.length > 0) {
            return res.status(409).json({
                error: `Table ${targetStation.tableNumber} is not available during this time slot (conflict detected with ${conflicts[0].booking.bookingCode}).`,
            });
        }
        // Calculate remaining duration
        const remainingMs = effectiveEnd.getTime() - effectiveStart.getTime();
        const remainingMinutes = Math.max(Math.ceil(remainingMs / (1000 * 60)), 1);
        const normType = (targetStation.deviceType || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
        const isSim = normType === 'CAR_SIMULATOR' || normType === 'SIMULATOR';
        const rate = await (0, exports.getHourlyRate)(targetStation.deviceType, controllerCount);
        let additionalGaming = 0;
        let appliedRatePerHour = rate;
        if (isSim) {
            additionalGaming = Math.round(rate * (remainingMinutes / 30));
            appliedRatePerHour = rate * 2;
        }
        else {
            additionalGaming = Math.round((rate * remainingMinutes) / 60);
            appliedRatePerHour = rate;
        }
        additionalGaming = Math.max(0, additionalGaming);
        const newGamingAmount = booking.gamingAmount + additionalGaming;
        const newGrandTotal = Math.max(0, newGamingAmount + booking.foodAmount - booking.discount);
        // Re-evaluate payment status
        const totalPaid = booking.payments.reduce((acc, p) => acc + p.amount, 0);
        let newPaymentStatus = 'UNPAID';
        if (totalPaid >= newGrandTotal) {
            newPaymentStatus = 'PAID';
        }
        else if (totalPaid > 0) {
            newPaymentStatus = 'PARTIAL';
        }
        else {
            newPaymentStatus = 'UNPAID';
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'BOOKING_ADD_CONSOLE',
                target: booking.bookingCode,
                newValue: `Added Table ${targetStation.tableNumber} (${targetStation.deviceType}) for remaining ${remainingMinutes}m (+₹${additionalGaming}). New Total: ₹${newGrandTotal}`,
            });
        }
        (0, socket_1.emitToAll)('booking_updated', updated);
        (0, socket_1.emitToAll)('booking.updated', updated);
        (0, socket_1.emitToAll)('station_updated', {});
        (0, socket_1.emitToAll)('station.updated', {});
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.addConsoleToBooking = addConsoleToBooking;
