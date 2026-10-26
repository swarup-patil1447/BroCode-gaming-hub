"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReports = exports.getDashboardSummary = void 0;
const prisma_1 = require("../utils/prisma");
const getDashboardSummary = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todayBookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: todayStart, lte: todayEnd },
            },
        });
        const todayPayments = await prisma_1.prisma.payment.findMany({
            where: {
                createdAt: { gte: todayStart, lte: todayEnd },
            },
        });
        const totalRevenue = todayPayments.reduce((acc, p) => acc + p.amount, 0);
        const totalGamingSales = todayBookings.reduce((acc, b) => acc + b.gamingAmount, 0);
        const totalFoodSales = todayBookings.reduce((acc, b) => acc + b.foodAmount, 0);
        const activeSessionsCount = await prisma_1.prisma.booking.count({
            where: { bookingStatus: 'ACTIVE' },
        });
        const occupiedStationsCount = await prisma_1.prisma.station.count({
            where: { status: 'OCCUPIED' },
        });
        const totalStations = await prisma_1.prisma.station.count();
        const pendingBookings = await prisma_1.prisma.booking.findMany({
            where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, bookingStatus: { not: 'CANCELLED' } },
        });
        const pendingPaymentAmount = pendingBookings.reduce((acc, b) => acc + b.grandTotal, 0);
        return res.json({
            data: {
                todayRevenue: totalRevenue,
                todayGamingSales: totalGamingSales,
                todayFoodSales: totalFoodSales,
                todayBookingsCount: todayBookings.length,
                activeSessions: activeSessionsCount,
                availableStations: Math.max(0, totalStations - occupiedStationsCount),
                occupiedStations: occupiedStationsCount,
                totalStations,
                pendingPaymentsCount: pendingBookings.length,
                pendingPaymentAmount,
                serverTime: new Date().toISOString(),
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getDashboardSummary = getDashboardSummary;
const getReports = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                bookingStatus: { not: 'CANCELLED' },
            },
            include: {
                stations: { include: { station: true } },
                foodItems: { include: { foodItem: true } },
                createdBy: true,
            },
        });
        const payments = await prisma_1.prisma.payment.findMany({
            where: {
                createdAt: { gte: start, lte: end },
            },
            include: {
                recordedBy: true,
            },
        });
        const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
        const totalGamingRevenue = bookings.reduce((acc, b) => acc + b.gamingAmount, 0);
        const totalFoodRevenue = bookings.reduce((acc, b) => acc + b.foodAmount, 0);
        const totalDiscount = bookings.reduce((acc, b) => acc + b.discount, 0);
        const paymentMethods = { CASH: 0, UPI: 0, CARD: 0, OTHER: 0 };
        payments.forEach((p) => {
            paymentMethods[p.paymentMethod] = (paymentMethods[p.paymentMethod] || 0) + p.amount;
        });
        // Daily breakdown
        const dailyMap = {};
        bookings.forEach((b) => {
            const day = b.createdAt.toISOString().slice(0, 10);
            if (!dailyMap[day]) {
                dailyMap[day] = { date: day, revenue: 0, gaming: 0, food: 0, bookings: 0 };
            }
            dailyMap[day].gaming += b.gamingAmount;
            dailyMap[day].food += b.foodAmount;
            dailyMap[day].bookings += 1;
        });
        payments.forEach((p) => {
            const day = p.createdAt.toISOString().slice(0, 10);
            if (!dailyMap[day]) {
                dailyMap[day] = { date: day, revenue: 0, gaming: 0, food: 0, bookings: 0 };
            }
            dailyMap[day].revenue += p.amount;
        });
        // Station usage
        const stations = await prisma_1.prisma.station.findMany({ orderBy: { tableNumber: 'asc' } });
        const stationUsage = stations.map((st) => {
            const stBookings = bookings.filter((b) => b.stations.some((s) => s.stationId === st.id));
            const bookingCount = stBookings.length;
            const totalMinutes = stBookings.reduce((acc, b) => {
                const mins = (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60);
                return acc + Math.max(mins, 0);
            }, 0);
            const rev = stBookings.reduce((acc, b) => {
                const bs = b.stations.find((s) => s.stationId === st.id);
                const hours = (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
                return acc + (bs?.appliedRatePerHour || 0) * hours;
            }, 0);
            return {
                tableNumber: st.tableNumber,
                deviceType: st.deviceType,
                bookingCount,
                totalMinutes: Math.round(totalMinutes),
                revenue: Math.round(rev),
            };
        });
        // Employee activity
        const employees = await prisma_1.prisma.user.findMany({ where: { role: 'EMPLOYEE' } });
        const employeeActivity = employees.map((emp) => {
            const created = bookings.filter((b) => b.createdById === emp.id).length;
            const collected = payments
                .filter((p) => p.recordedById === emp.id)
                .reduce((acc, p) => acc + p.amount, 0);
            return {
                name: emp.name,
                employeeId: emp.employeeId,
                bookingsCount: created,
                paymentsCollected: collected,
            };
        });
        return res.json({
            data: {
                summary: {
                    totalRevenue,
                    totalGamingRevenue,
                    totalFoodRevenue,
                    totalDiscount,
                    totalBookings: bookings.length,
                    totalPaymentsCount: payments.length,
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                },
                paymentMethods,
                dailyBreakdown: Object.values(dailyMap),
                stationUsage,
                employeeActivity,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getReports = getReports;
