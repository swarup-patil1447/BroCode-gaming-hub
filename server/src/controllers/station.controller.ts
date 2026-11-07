import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';
import { emitToAll } from '../socket';

// Helper to format Date to human readable 12-hour time (e.g. "9:00 PM")
const formatReadableTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const getAllStations = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const stations = await prisma.station.findMany({
      orderBy: { tableNumber: 'asc' },
    });

    const populatedStations = await Promise.all(
      stations.map(async (st) => {
        // 1. Find current active booking on this station
        const currentBookingStation = await prisma.bookingStation.findFirst({
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
        const futureBookingStations = await prisma.bookingStation.findMany({
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
        let nextAvailableTime: string | null = null;
        let nextAvailableTimestamp: string | null = null;
        let availableUntil: string | null = null;

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
        } else {
          // Station is available now
          if (nextUpcomingBooking) {
            availableUntil = formatReadableTime(nextUpcomingBooking.startTime);
            nextAvailableTime = 'Available Now';
            nextAvailableTimestamp = now.toISOString();
          } else {
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
              durationMinutes: Math.round(
                (currentBookingStation.booking.endTime.getTime() - currentBookingStation.booking.startTime.getTime()) /
                  (1000 * 60)
              ),
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
      })
    );

    return res.json({ data: populatedStations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const registerConsole = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only owners can register an additional console' });
    }

    const tableNumber = Number(req.body.tableNumber);
    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      return res.status(400).json({ error: 'A valid table number is required' });
    }

    const station = await prisma.$transaction(async (tx) => {
      const tableStation = await tx.station.findFirst({
        where: { tableNumber },
        orderBy: { id: 'asc' },
      });
      if (!tableStation) {
        throw new Error(`Table ${tableNumber} was not found`);
      }

      const maxStation = await tx.station.aggregate({ _max: { id: true } });
      return tx.station.create({
        data: {
          id: (maxStation._max.id || 0) + 1,
          tableNumber,
          deviceType: tableStation.deviceType,
          status: 'AVAILABLE',
        },
      });
    }, { isolationLevel: 'Serializable' });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'STATION_CONSOLE_REGISTER',
        target: `Table ${tableNumber}`,
        newValue: `Registered additional ${station.deviceType} console (ID ${station.id})`,
      });
    }

    emitToAll('station_updated', station);
    emitToAll('station.updated', station);
    return res.status(201).json({ data: station });
  } catch (err: any) {
    if (err.message?.includes('was not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
};

export const updateStationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const station = await prisma.station.update({
      where: { id: parseInt(id, 10) },
      data: { status },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'STATION_STATUS_UPDATE',
        target: `Table ${station.tableNumber}`,
        newValue: `Status changed to ${status}`,
      });
    }

    emitToAll('station_updated', station);
    emitToAll('station.updated', station);
    return res.json({ data: station });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

