"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStationStatus = exports.getAllStations = void 0;
const prisma_1 = require("../utils/prisma");
const auditLogger_1 = require("../utils/auditLogger");
const socket_1 = require("../socket");
// Helper to format Date to human readable 12-hour time (e.g. "9:00 PM")
const formatReadableTime = (date) => {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};
const getAllStations = async (req, res) => {
    try {
        const now = new Date();
        const stations = await prisma_1.prisma.station.findMany({
            orderBy: { tableNumber: 'asc' },
        });
        const populatedStations = await Promise.all(stations.map(async (st) => {
            // 1. Find current active booking on this station
            const currentBookingStation = await prisma_1.prisma.bookingStation.findFirst({
                where: {
                    stationId: st.id,
                    booking: {
                        bookingStatus: 'ACTIVE',
                        startTime: { lte: now },
                        endTime: { gt: now },
                    },
                },
                include: {
                    booking: {
                        include: {
                            createdBy: {
                                select: { id: true, name: true, employeeId: true, role: true },
                            },
                            stations: { include: { station: true } },
                            foodItems: { include: { foodItem: true } },
                            payments: true,
                        },
                    },
                },
            });
            // 2. Find all upcoming / active bookings for today and beyond
            const futureBookingStations = await prisma_1.prisma.bookingStation.findMany({
                where: {
                    stationId: st.id,
                    booking: {
                        bookingStatus: { in: ['UPCOMING', 'ACTIVE'] },
                        endTime: { gt: now },
                    },
                },
                orderBy: { booking: { startTime: 'asc' } },
                include: {
                    booking: {
                        include: {
                            createdBy: {
                                select: { id: true, name: true, employeeId: true, role: true },
                            },
                        },
                    },
                },
            });
            const isOccupied = !!currentBookingStation && st.status !== 'MAINTENANCE';
            let remainingSeconds = 0;
            let nextAvailableTime = null;
            let nextAvailableTimestamp = null;
            let availableUntil = null;
            // Separate current vs future upcoming bookings
            const upcomingBookings = futureBookingStations
                .map((fbs) => fbs.booking)
                .filter((b) => b.startTime > now);
            const nextUpcomingBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;
            if (isOccupied && currentBookingStation?.booking) {
                const currentB = currentBookingStation.booking;
                remainingSeconds = Math.max(0, Math.floor((currentB.endTime.getTime() - now.getTime()) / 1000));
                // Calculate chained contiguous next-free time
                // If another booking starts at or before current endTime, extend free time calculation
                let chainedEndTime = new Date(currentB.endTime);
                let foundChained = true;
                while (foundChained) {
                    foundChained = false;
                    for (const ub of upcomingBookings) {
                        // Within 5 minutes gap or overlapping
                        if (ub.startTime <= new Date(chainedEndTime.getTime() + 5 * 60 * 1000) && ub.endTime > chainedEndTime) {
                            chainedEndTime = new Date(ub.endTime);
                            foundChained = true;
                        }
                    }
                }
                nextAvailableTimestamp = chainedEndTime.toISOString();
                nextAvailableTime = `Free at ${formatReadableTime(chainedEndTime)}`;
            }
            else {
                // Station is available now
                if (nextUpcomingBooking) {
                    availableUntil = formatReadableTime(nextUpcomingBooking.startTime);
                    nextAvailableTime = 'Available Now';
                    nextAvailableTimestamp = now.toISOString();
                }
                else {
                    nextAvailableTime = 'Available Now';
                    nextAvailableTimestamp = now.toISOString();
                }
            }
            const currentBookingData = currentBookingStation?.booking
                ? {
                    id: currentBookingStation.booking.id,
                    bookingCode: currentBookingStation.booking.bookingCode,
                    customerName: currentBookingStation.booking.customerName,
                    customerMobile: currentBookingStation.booking.customerMobile,
                    controllerCount: currentBookingStation.booking.controllerCount,
                    startTime: currentBookingStation.booking.startTime.toISOString(),
                    endTime: currentBookingStation.booking.endTime.toISOString(),
                    durationMinutes: Math.round((currentBookingStation.booking.endTime.getTime() - currentBookingStation.booking.startTime.getTime()) /
                        (1000 * 60)),
                    gamingAmount: currentBookingStation.booking.gamingAmount,
                    foodAmount: currentBookingStation.booking.foodAmount,
                    discount: currentBookingStation.booking.discount,
                    grandTotal: currentBookingStation.booking.grandTotal,
                    paymentStatus: currentBookingStation.booking.paymentStatus,
                    createdByName: currentBookingStation.booking.createdBy?.name || 'Staff',
                }
                : null;
            return {
                id: st.id,
                tableNumber: st.tableNumber,
                deviceType: st.deviceType,
                status: st.status,
                isOccupied,
                remainingSeconds,
                nextAvailableTime,
                nextAvailableTimestamp,
                availableUntil,
                upcomingBookingsCount: upcomingBookings.length,
                currentBooking: currentBookingData,
                nextUpcomingBooking: nextUpcomingBooking
                    ? {
                        id: nextUpcomingBooking.id,
                        customerName: nextUpcomingBooking.customerName,
                        startTime: nextUpcomingBooking.startTime.toISOString(),
                        endTime: nextUpcomingBooking.endTime.toISOString(),
                    }
                    : null,
                upcomingBookings: upcomingBookings.map((b) => ({
                    id: b.id,
                    bookingCode: b.bookingCode,
                    customerName: b.customerName,
                    startTime: b.startTime.toISOString(),
                    endTime: b.endTime.toISOString(),
                })),
            };
        }));
        return res.json({ data: populatedStations });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllStations = getAllStations;
const updateStationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const station = await prisma_1.prisma.station.update({
            where: { id: parseInt(id, 10) },
            data: { status },
        });
        if (req.user) {
            await (0, auditLogger_1.createAuditLog)({
                userId: req.user.id,
                userName: req.user.name,
                userEmpId: req.user.employeeId,
                role: req.user.role,
                action: 'STATION_STATUS_UPDATE',
                target: `Table ${station.tableNumber}`,
                newValue: `Status changed to ${status}`,
            });
        }
        (0, socket_1.emitToAll)('station_updated', station);
        (0, socket_1.emitToAll)('station.updated', station);
        return res.json({ data: station });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.updateStationStatus = updateStationStatus;
