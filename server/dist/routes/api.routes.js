"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const authCtrl = __importStar(require("../controllers/auth.controller"));
const stationCtrl = __importStar(require("../controllers/station.controller"));
const bookingCtrl = __importStar(require("../controllers/booking.controller"));
const pricingCtrl = __importStar(require("../controllers/pricing.controller"));
const foodCtrl = __importStar(require("../controllers/food.controller"));
const paymentCtrl = __importStar(require("../controllers/payment.controller"));
const employeeCtrl = __importStar(require("../controllers/employee.controller"));
const reportCtrl = __importStar(require("../controllers/report.controller"));
const notifCtrl = __importStar(require("../controllers/notification.controller"));
const auditCtrl = __importStar(require("../controllers/auditLog.controller"));
exports.router = (0, express_1.Router)();
// Health check route
exports.router.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), service: 'BroCode Gaming Cafe API' });
});
// Auth routes
exports.router.post('/auth/login', authCtrl.login);
exports.router.get('/auth/me', auth_1.authenticate, authCtrl.getMe);
exports.router.post('/auth/change-password', auth_1.authenticate, auth_1.requireOwner, authCtrl.changePassword);
exports.router.post('/auth/employee/change-password', auth_1.authenticate, authCtrl.employeeChangePassword);
exports.router.post('/auth/forgot-password/request-otp', authCtrl.requestOTP);
exports.router.post('/auth/forgot-password/verify-otp', authCtrl.verifyOTPAndResetPassword);
exports.router.get('/auth/dev-sms-logs', authCtrl.getDevSMSLogs);
// Station routes
exports.router.get('/stations', stationCtrl.getAllStations);
exports.router.put('/stations/:id/status', auth_1.authenticate, stationCtrl.updateStationStatus);
// Booking routes
exports.router.get('/bookings/check-availability', bookingCtrl.checkAvailability);
exports.router.get('/bookings', auth_1.authenticate, bookingCtrl.getAllBookings);
exports.router.get('/bookings/:id', auth_1.authenticate, bookingCtrl.getBookingById);
exports.router.post('/bookings', auth_1.authenticate, bookingCtrl.createBooking);
exports.router.put('/bookings/:id', auth_1.authenticate, bookingCtrl.updateBooking);
exports.router.post('/bookings/:id/extend', auth_1.authenticate, bookingCtrl.extendSession);
exports.router.post('/bookings/:id/cancel', auth_1.authenticate, bookingCtrl.cancelBooking);
exports.router.post('/bookings/:id/food', auth_1.authenticate, bookingCtrl.addFoodToBooking);
// Pricing routes
exports.router.get('/pricing', pricingCtrl.getAllPricing);
exports.router.put('/pricing', auth_1.authenticate, auth_1.requireOwner, pricingCtrl.updatePricing);
// Food catalog routes
exports.router.get('/food', foodCtrl.getAllFood);
exports.router.post('/food', auth_1.authenticate, auth_1.requireOwner, foodCtrl.createFood);
exports.router.put('/food/:id', auth_1.authenticate, auth_1.requireOwner, foodCtrl.updateFood);
exports.router.delete('/food/:id', auth_1.authenticate, auth_1.requireOwner, foodCtrl.deleteFood);
// Payment routes
exports.router.post('/payments', auth_1.authenticate, paymentCtrl.recordPayment);
exports.router.get('/payments', auth_1.authenticate, paymentCtrl.getAllPayments);
// Employee management routes (Owner Only)
exports.router.get('/employees', auth_1.authenticate, auth_1.requireOwner, employeeCtrl.getAllEmployees);
exports.router.post('/employees', auth_1.authenticate, auth_1.requireOwner, employeeCtrl.createEmployee);
exports.router.put('/employees/:id', auth_1.authenticate, auth_1.requireOwner, employeeCtrl.updateEmployee);
exports.router.post('/employees/:id/reset-password', auth_1.authenticate, auth_1.requireOwner, employeeCtrl.resetEmployeePassword);
exports.router.delete('/employees/:id', auth_1.authenticate, auth_1.requireOwner, employeeCtrl.deleteEmployee);
// Report routes
exports.router.get('/reports/dashboard-summary', auth_1.authenticate, reportCtrl.getDashboardSummary);
exports.router.get('/reports', auth_1.authenticate, auth_1.requireOwner, reportCtrl.getReports);
// Notification routes
exports.router.get('/notifications', auth_1.authenticate, notifCtrl.getAllNotifications);
exports.router.put('/notifications/read-all', auth_1.authenticate, notifCtrl.markAllAsRead);
exports.router.put('/notifications/:id/read', auth_1.authenticate, notifCtrl.markAsRead);
// Audit log routes
exports.router.get('/audit-logs', auth_1.authenticate, auth_1.requireOwner, auditCtrl.getAllAuditLogs);
