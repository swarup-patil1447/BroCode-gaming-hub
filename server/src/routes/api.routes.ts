import { Router } from 'express';
import { authenticate, requireOwner } from '../middlewares/auth';
import * as authCtrl from '../controllers/auth.controller';
import * as stationCtrl from '../controllers/station.controller';
import * as bookingCtrl from '../controllers/booking.controller';
import * as pricingCtrl from '../controllers/pricing.controller';
import * as foodCtrl from '../controllers/food.controller';
import * as paymentCtrl from '../controllers/payment.controller';
import * as employeeCtrl from '../controllers/employee.controller';
import * as reportCtrl from '../controllers/report.controller';
import * as notifCtrl from '../controllers/notification.controller';
import * as auditCtrl from '../controllers/auditLog.controller';

export const router = Router();

// Auth routes
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticate as any, authCtrl.getMe as any);
router.post('/auth/change-password', authenticate as any, requireOwner as any, authCtrl.changePassword as any);
router.post('/auth/employee/change-password', authenticate as any, authCtrl.employeeChangePassword as any);
router.post('/auth/forgot-password/request-otp', authCtrl.requestOTP);
router.post('/auth/forgot-password/verify-otp', authCtrl.verifyOTPAndResetPassword);
router.get('/auth/dev-sms-logs', authCtrl.getDevSMSLogs);

// Station routes
router.get('/stations', stationCtrl.getAllStations);
router.put('/stations/:id/status', authenticate as any, stationCtrl.updateStationStatus as any);

// Booking routes
router.get('/bookings/check-availability', bookingCtrl.checkAvailability);
router.get('/bookings', authenticate as any, bookingCtrl.getAllBookings);
router.get('/bookings/:id', authenticate as any, bookingCtrl.getBookingById);
router.post('/bookings', authenticate as any, bookingCtrl.createBooking as any);
router.put('/bookings/:id', authenticate as any, bookingCtrl.updateBooking as any);
router.post('/bookings/:id/extend', authenticate as any, bookingCtrl.extendSession as any);
router.post('/bookings/:id/cancel', authenticate as any, bookingCtrl.cancelBooking as any);
router.post('/bookings/:id/food', authenticate as any, bookingCtrl.addFoodToBooking as any);

// Pricing routes
router.get('/pricing', pricingCtrl.getAllPricing);
router.put('/pricing', authenticate as any, requireOwner as any, pricingCtrl.updatePricing as any);

// Food catalog routes
router.get('/food', foodCtrl.getAllFood);
router.post('/food', authenticate as any, requireOwner as any, foodCtrl.createFood as any);
router.put('/food/:id', authenticate as any, requireOwner as any, foodCtrl.updateFood as any);
router.delete('/food/:id', authenticate as any, requireOwner as any, foodCtrl.deleteFood as any);

// Payment routes
router.post('/payments', authenticate as any, paymentCtrl.recordPayment as any);
router.get('/payments', authenticate as any, paymentCtrl.getAllPayments);

// Employee management routes (Owner Only)
router.get('/employees', authenticate as any, requireOwner as any, employeeCtrl.getAllEmployees);
router.post('/employees', authenticate as any, requireOwner as any, employeeCtrl.createEmployee as any);
router.put('/employees/:id', authenticate as any, requireOwner as any, employeeCtrl.updateEmployee as any);
router.post('/employees/:id/reset-password', authenticate as any, requireOwner as any, employeeCtrl.resetEmployeePassword as any);
router.delete('/employees/:id', authenticate as any, requireOwner as any, employeeCtrl.deleteEmployee as any);

// Report routes
router.get('/reports/dashboard-summary', authenticate as any, reportCtrl.getDashboardSummary);
router.get('/reports', authenticate as any, requireOwner as any, reportCtrl.getReports);

// Notification routes
router.get('/notifications', authenticate as any, notifCtrl.getAllNotifications as any);
router.put('/notifications/read-all', authenticate as any, notifCtrl.markAllAsRead as any);
router.put('/notifications/:id/read', authenticate as any, notifCtrl.markAsRead);

// Audit log routes
router.get('/audit-logs', authenticate as any, requireOwner as any, auditCtrl.getAllAuditLogs);
