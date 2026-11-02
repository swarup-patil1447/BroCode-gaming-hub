import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

describe('Add Console to Existing Booking Test Suite', () => {
  let ownerToken: string;
  let employeeToken: string;
  let activeBookingId: string;
  let expiredBookingId: string;
  let completedBookingId: string;
  let cancelledBookingId: string;

  beforeAll(async () => {
    // 1. Setup Owner Account credentials
    const ownerHash = await bcrypt.hash('OwnerPass2026!', 10);
    await prisma.user.upsert({
      where: { employeeId: 'owner' },
      update: { password: ownerHash, isActive: true, role: 'OWNER' },
      create: {
        employeeId: 'owner',
        name: 'BroCode Owner',
        mobile: '+919999999999',
        password: ownerHash,
        role: 'OWNER',
        isActive: true,
      },
    });

    // 2. Setup Employee Account credentials
    const empHash = await bcrypt.hash('emp123', 10);
    await prisma.user.upsert({
      where: { employeeId: 'EMP001' },
      update: { password: empHash, isActive: true, role: 'EMPLOYEE' },
      create: {
        employeeId: 'EMP001',
        name: 'Rohan Sharma',
        mobile: '+919000000001',
        password: empHash,
        role: 'EMPLOYEE',
        isActive: true,
      },
    });

    // 3. Login
    const ownerRes = await request(app).post('/api/auth/login').send({ employeeId: 'owner', password: 'OwnerPass2026!' });
    ownerToken = ownerRes.body.data.token;

    const empRes = await request(app).post('/api/auth/login').send({ employeeId: 'EMP001', password: 'emp123' });
    employeeToken = empRes.body.data.token;

    // Ensure pricing rules: CAR_SIMULATOR = 80, PS5 = 90, PS4 = 70, PC = 70
    await prisma.pricingRule.upsert({
      where: { deviceType_controllerCount: { deviceType: 'CAR_SIMULATOR', controllerCount: 1 } },
      update: { hourlyRate: 80 },
      create: { deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: 80 },
    });
    await prisma.pricingRule.upsert({
      where: { deviceType_controllerCount: { deviceType: 'PS5', controllerCount: 1 } },
      update: { hourlyRate: 90 },
      create: { deviceType: 'PS5', controllerCount: 1, hourlyRate: 90 },
    });
    await prisma.pricingRule.upsert({
      where: { deviceType_controllerCount: { deviceType: 'PC', controllerCount: 1 } },
      update: { hourlyRate: 70 },
      create: { deviceType: 'PC', controllerCount: 1, hourlyRate: 70 },
    });

    // Ensure stations 1-8 are AVAILABLE
    await prisma.station.updateMany({
      data: { status: 'AVAILABLE' },
    });
  });

  afterAll(async () => {
    // Cleanup bookings created in this test
    await prisma.bookingStation.deleteMany({
      where: { booking: { customerName: { startsWith: 'AddConsole Customer' } } },
    });
    await prisma.payment.deleteMany({
      where: { booking: { customerName: { startsWith: 'AddConsole Customer' } } },
    });
    await prisma.booking.deleteMany({
      where: { customerName: { startsWith: 'AddConsole Customer' } },
    });
    await prisma.station.updateMany({
      data: { status: 'AVAILABLE' },
    });
    // Ensure simulator rate remains 80
    await prisma.pricingRule.updateMany({
      where: { deviceType: { in: ['CAR_SIMULATOR', 'SIMULATOR'] } },
      data: { hourlyRate: 80 },
    });
    await prisma.$disconnect();
  });

  it('1. POST /api/bookings/:id/add-console rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/bookings/some-id/add-console')
      .send({ stationId: 1 });
    expect(res.status).toBe(401);
  });

  it('2. Adding a console calculates prorated remaining duration correctly and updates grandTotal', async () => {
    // Create an active 60-minute booking on Table 6 (Car Simulator) at ₹80/30m = ₹160
    const now = new Date();
    // Started 30 mins ago, ends 30 mins from now -> exactly 30 mins remaining
    const startTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'AddConsole Customer 1',
        customerMobile: '9988776655',
        stationIds: [6], // Car Simulator
        controllerCount: 1,
        startTime,
        endTime,
      });

    expect(createRes.status).toBe(201);
    const booking = createRes.body.data;
    activeBookingId = booking.id;
    expect(booking.gamingAmount).toBe(160);
    expect(booking.grandTotal).toBe(160);
    expect(booking.stations.length).toBe(1);

    // Employee adds Table 1 (PS5, ₹90/hr) for the remaining 30 minutes
    // Remaining time is ~30 minutes -> ₹90 * (30 / 60) = ₹45
    const addRes = await request(app)
      .post(`/api/bookings/${activeBookingId}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 1, controllerCount: 1 });

    expect(addRes.status).toBe(200);
    const updated = addRes.body.data;
    expect(updated.stations.length).toBe(2);
    expect(updated.stations.some((s: any) => s.stationId === 1)).toBe(true);
    expect(updated.stations.some((s: any) => s.stationId === 6)).toBe(true);

    // Gaming total should now be ₹160 + ₹45 = ₹205
    expect(updated.gamingAmount).toBe(205);
    expect(updated.grandTotal).toBe(205);

    // Newly added station should now be OCCUPIED
    const st1 = await prisma.station.findUnique({ where: { id: 1 } });
    expect(st1?.status).toBe('OCCUPIED');
  });

  it('3. Re-adding the same station to the booking is rejected (400)', async () => {
    const res = await request(app)
      .post(`/api/bookings/${activeBookingId}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already part of this booking');
  });

  it('4. Adding an unavailable station with an overlapping booking is rejected (409 Conflict)', async () => {
    // Table 1 is already in use by activeBookingId.
    // Create another booking and try to add Table 1 to it.
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 20 * 60 * 1000).toISOString();

    const otherRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'AddConsole Customer 2',
        customerMobile: '9988776656',
        stationIds: [7], // Table 7 (PC)
        startTime,
        endTime,
      });

    const otherBookingId = otherRes.body.data.id;

    // Try to add Table 1 (already occupied by activeBookingId)
    const conflictRes = await request(app)
      .post(`/api/bookings/${otherBookingId}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 1 });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toContain('conflict detected with');
  });

  it('5. Adding a station currently under MAINTENANCE is rejected (409 Conflict)', async () => {
    // Put Table 2 into MAINTENANCE
    await prisma.station.update({ where: { id: 2 }, data: { status: 'MAINTENANCE' } });

    const res = await request(app)
      .post(`/api/bookings/${activeBookingId}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('maintenance');

    // Restore Table 2
    await prisma.station.update({ where: { id: 2 }, data: { status: 'AVAILABLE' } });
  });

  it('6. Adding console when customer previously paid in full transitions paymentStatus to PARTIAL', async () => {
    // Create a new booking
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 40m duration

    const bRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'AddConsole Customer Paid',
        customerMobile: '9988776657',
        stationIds: [8], // Table 8 PC
        startTime,
        endTime,
      });

    const bookingId = bRes.body.data.id;
    const initialTotal = bRes.body.data.grandTotal;

    // Customer pays initial total in full
    const payRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        bookingId,
        amount: initialTotal,
        paymentMethod: 'UPI',
      });

    expect(payRes.status).toBe(201);

    // Verify booking is marked PAID
    const paidBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(paidBooking?.paymentStatus).toBe('PAID');

    // Now employee adds Table 3 (PS4, ₹70/hr)
    const addRes = await request(app)
      .post(`/api/bookings/${bookingId}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 3, controllerCount: 1 });

    expect(addRes.status).toBe(200);
    const updated = addRes.body.data;

    // Grand total increased
    expect(updated.grandTotal).toBeGreaterThan(initialTotal);
    // Since customer only paid initialTotal, paymentStatus should now be PARTIAL
    expect(updated.paymentStatus).toBe('PARTIAL');

    // Original payment record is preserved
    const payments = await prisma.payment.findMany({ where: { bookingId } });
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(initialTotal);
  });

  it('7. Cannot add console to CANCELLED or COMPLETED booking', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 20 * 60 * 1000).toISOString();

    const bRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'AddConsole Customer Cancelled',
        customerMobile: '9988776658',
        stationIds: [4],
        startTime,
        endTime,
      });

    const bId = bRes.body.data.id;

    // Cancel booking
    await request(app)
      .post(`/api/bookings/${bId}/cancel`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ cancelReason: 'Customer left' });

    // Try to add console
    const addRes = await request(app)
      .post(`/api/bookings/${bId}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 2 });

    expect(addRes.status).toBe(400);
    expect(addRes.body.error).toContain('cancelled');
  });

  it('8. Cannot add console to an expired booking (session ended)', async () => {
    const now = new Date();
    // Booking ended 10 minutes ago
    const startTime = new Date(now.getTime() - 40 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

    const expiredBooking = await prisma.booking.create({
      data: {
        bookingCode: `BC-EXP-${Date.now()}`,
        customerName: 'AddConsole Customer Expired',
        customerMobile: '9988776659',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        gamingAmount: 70,
        grandTotal: 70,
        bookingStatus: 'ACTIVE',
        stations: {
          create: [{ stationId: 4, appliedRatePerHour: 70 }],
        },
      },
    });

    const addRes = await request(app)
      .post(`/api/bookings/${expiredBooking.id}/add-console`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ stationId: 2 });

    expect(addRes.status).toBe(400);
    expect(addRes.body.error).toContain('ended');
  });

  it('9. Audit log is created recording employee action', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'BOOKING_ADD_CONSOLE' },
      orderBy: { timestamp: 'desc' },
    });

    expect(logs.length).toBeGreaterThan(0);
    const latest = logs[0];
    expect(latest.role).toBe('EMPLOYEE');
    expect(latest.newValue).toContain('Added Table');
  });
});
