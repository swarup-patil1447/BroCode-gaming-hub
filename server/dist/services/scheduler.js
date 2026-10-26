"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = void 0;
const prisma_1 = require("../utils/prisma");
const socket_1 = require("../socket");
const startScheduler = () => {
    // Run checks every 10 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            // Find active bookings that have reached or passed endTime
            const expiredBookings = await prisma_1.prisma.booking.findMany({
                where: {
                    bookingStatus: 'ACTIVE',
                    endTime: { lte: now },
                },
                include: {
                    stations: { include: { station: true } },
                },
            });
            for (const b of expiredBookings) {
                // Complete booking
                await prisma_1.prisma.booking.update({
                    where: { id: b.id },
                    data: { bookingStatus: 'COMPLETED' },
                });
                // Free up stations
                for (const bs of b.stations) {
                    await prisma_1.prisma.station.update({
                        where: { id: bs.stationId },
                        data: { status: 'AVAILABLE' },
                    });
                }
                // Create notification
                const tableNames = b.stations.map((s) => `Table ${s.station.tableNumber}`).join(', ');
                await prisma_1.prisma.notification.create({
                    data: {
                        type: 'SESSION_EXPIRED',
                        title: 'Session Completed',
                        message: `Session for ${b.customerName} on ${tableNames} has completed.`,
                        targetRole: 'ALL',
                    },
                });
                // Trigger real-time alarm and update
                (0, socket_1.emitToAll)('session.ended', {
                    bookingId: b.id,
                    bookingCode: b.bookingCode,
                    customerName: b.customerName,
                    tableNumbers: tableNames,
                    tableNames,
                    endTime: b.endTime.toISOString(),
                    action: 'EXPIRED',
                });
                (0, socket_1.emitToAll)('session_alarm', {
                    bookingId: b.id,
                    bookingCode: b.bookingCode,
                    customerName: b.customerName,
                    tableNames,
                    tableNumbers: tableNames,
                    endTime: b.endTime.toISOString(),
                    action: 'EXPIRED',
                });
                (0, socket_1.emitToAll)('station_updated', {});
                (0, socket_1.emitToAll)('station.updated', {});
                (0, socket_1.emitToAll)('booking_updated', b);
                (0, socket_1.emitToAll)('booking.updated', b);
            }
        }
        catch (err) {
            console.error('Scheduler error:', err);
        }
    }, 10000);
};
exports.startScheduler = startScheduler;
