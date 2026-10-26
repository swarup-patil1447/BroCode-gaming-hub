"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPayments = exports.recordPayment = void 0;
const prisma_1 = require("../utils/prisma");
const auditLogger_1 = require("../utils/auditLogger");
const socket_1 = require("../socket");
const recordPayment = async (req, res) => {
    try {
        const { bookingId, amount, paymentMethod } = req.body;
        if (!bookingId || amount === undefined || !paymentMethod) {
            return res.status(400).json({ error: 'bookingId, amount, and paymentMethod are required' });
        }
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                payments: true,
                stations: { include: { station: true } },
            },
        });
        if (!booking)
            return res.status(404).json({ error: 'Booking not found' });
        const payment = await prisma_1.prisma.payment.create({
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
        const allPayments = await prisma_1.prisma.payment.findMany({ where: { bookingId: booking.id } });
        const totalPaid = allPayments.reduce((acc, p) => acc + p.amount, 0);
        let paymentStatus = 'PARTIAL';
        if (totalPaid >= booking.grandTotal) {
            paymentStatus = 'PAID';
        }
        else if (totalPaid === 0) {
            paymentStatus = 'UNPAID';
        }
        const updatedBooking = await prisma_1.prisma.booking.update({
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
            await (0, auditLogger_1.createAuditLog)({
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
        const notif = await prisma_1.prisma.notification.create({
            data: {
                type: 'PAYMENT_RECEIVED',
                title: 'Payment Received',
                message: `₹${amount} recorded for ${booking.customerName} (${booking.bookingCode}) via ${paymentMethod} by ${req.user?.name || 'Staff'}.`,
                targetRole: 'OWNER',
            },
        });
        (0, socket_1.emitToRole)('OWNER', 'payment_recorded', {
            payment,
            booking: updatedBooking,
            notification: notif,
        });
        (0, socket_1.emitToRole)('OWNER', 'payment.created', {
            payment,
            booking: updatedBooking,
            notification: notif,
        });
        (0, socket_1.emitToAll)('booking_updated', updatedBooking);
        (0, socket_1.emitToAll)('booking.updated', updatedBooking);
        (0, socket_1.emitToAll)('payment.created', payment);
        return res.status(201).json({
            data: {
                payment,
                booking: updatedBooking,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.recordPayment = recordPayment;
const getAllPayments = async (req, res) => {
    try {
        const { bookingId } = req.query;
        const payments = await prisma_1.prisma.payment.findMany({
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getAllPayments = getAllPayments;
