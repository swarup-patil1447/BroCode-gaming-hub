import { prisma } from '../utils/prisma';
import { emitToAll, emitToRole } from '../socket';

export const startScheduler = () => {
  // Run checks every 10 seconds
  setInterval(async () => {
    try {
      const now = new Date();

      // Find active bookings that have reached or passed endTime
      const expiredBookings = await prisma.booking.findMany({
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
        await prisma.booking.update({
          where: { id: b.id },
          data: { bookingStatus: 'COMPLETED' },
        });

        // Free up stations
        for (const bs of b.stations) {
          await prisma.station.update({
            where: { id: bs.stationId },
            data: { status: 'AVAILABLE' },
          });
        }

        // Create notification
        const tableNames = b.stations.map((s) => `Table ${s.station.tableNumber}`).join(', ');
        await prisma.notification.create({
          data: {
            type: 'SESSION_EXPIRED',
            title: 'Session Completed',
            message: `Session for ${b.customerName} on ${tableNames} has completed.`,
            targetRole: 'ALL',
          },
        });

        // Trigger real-time alarm and update
        emitToAll('session.ended', {
          bookingId: b.id,
          bookingCode: b.bookingCode,
          customerName: b.customerName,
          tableNumbers: tableNames,
          tableNames,
          endTime: b.endTime.toISOString(),
          action: 'EXPIRED',
        });
        emitToAll('session_alarm', {
          bookingId: b.id,
          bookingCode: b.bookingCode,
          customerName: b.customerName,
          tableNames,
          tableNumbers: tableNames,
          endTime: b.endTime.toISOString(),
          action: 'EXPIRED',
        });
        emitToAll('station_updated', {});
        emitToAll('station.updated', {});
        emitToAll('booking_updated', b);
        emitToAll('booking.updated', b);
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  }, 10000);
};
