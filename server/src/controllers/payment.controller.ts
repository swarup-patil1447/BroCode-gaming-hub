import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createAuditLog } from '../utils/auditLogger';
import { emitToAll, emitToRole } from '../socket';

export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;

    if (!bookingId || amount === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'bookingId, amount, and paymentMethod are required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
        stations: { include: { station: true } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: parseFloat(amount),
        paymentMethod,
        recordedById: req.user?.id,
      },
      include: {
        recordedBy: true,
      },
    });

    // Update booking payment status
    const allPayments = await prisma.payment.findMany({ where: { bookingId: booking.id } });
    const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);

    let paymentStatus = 'PARTIAL';
    if (totalPaid >= booking.grandTotal) {
      paymentStatus = 'PAID';
    } else if (totalPaid === 0) {
      paymentStatus = 'UNPAID';
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus,
        paymentMethod,
      },
      include: {
        stations: { include: { station: true } },
        foodItems: { include: { foodItem: true } },
        payments: true,
      },
    });

    // Create Audit Log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userEmpId: req.user.employeeId,
        role: req.user.role,
        action: 'PAYMENT_RECORD',
        target: booking.bookingCode,
        newValue: `₹${amount} via ${paymentMethod}. Total status: ${paymentStatus}`,
      });
    }

    // Owner Push Notification via Socket.IO
    const notif = await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        message: `₹${amount} recorded for ${booking.customerName} (${booking.bookingCode}) via ${paymentMethod} by ${req.user?.name || 'Staff'}.`,
        targetRole: 'OWNER',
      },
    });

    emitToRole('OWNER', 'payment_recorded', {
      payment,
      booking: updatedBooking,
      notification: notif,
    });
    emitToRole('OWNER', 'payment.created', {
      payment,
      booking: updatedBooking,
      notification: notif,
    });

    emitToAll('booking_updated', updatedBooking);
    emitToAll('booking.updated', updatedBooking);
    emitToAll('payment.created', payment);

    return res.status(201).json({
      data: {
        payment,
        booking: updatedBooking,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.query;
    const payments = await prisma.payment.findMany({
      where: bookingId ? { bookingId: String(bookingId) } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: {
          select: { id: true, name: true, employeeId: true },
        },
        booking: {
          select: {
            id: true,
            bookingCode: true,
            customerName: true,
            customerMobile: true,
            grandTotal: true,
          },
        },
      },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      processedById: p.recordedById || '',
      processedByName: p.recordedBy?.name || 'System',
      processedByEmpId: p.recordedBy?.employeeId || 'SYS',
      status: 'SUCCESS',
      createdAt: p.createdAt.toISOString(),
      booking: p.booking,
    }));

    return res.json({ data: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
