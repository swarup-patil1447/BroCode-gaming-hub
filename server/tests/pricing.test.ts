import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

describe('BroCode Device Pricing and Car Simulator Updates Test Suite', () => {
  let ownerToken: string;
  let employeeToken: string;
  let ownerUserId: string;

  beforeAll(async () => {
    // 1. Setup Owner Account credentials
    const ownerHash = await bcrypt.hash('OwnerPass2026!', 10);
    const owner = await prisma.user.upsert({
      where: { employeeId: 'owner' },
      update: {
        password: ownerHash,
        mustChangePassword: false,
        isActive: true,
        role: 'OWNER',
      },
      create: {
        employeeId: 'owner',
        name: 'BroCode Owner',
        mobile: '+919999999999',
        password: ownerHash,
        role: 'OWNER',
        isActive: true,
        mustChangePassword: false,
      },
    });
    ownerUserId = owner.id;

    // 2. Setup Employee Account credentials
    const empHash = await bcrypt.hash('emp123', 10);
    await prisma.user.upsert({
      where: { employeeId: 'EMP001' },
      update: {
        password: empHash,
        mustChangePassword: false,
        isActive: true,
        role: 'EMPLOYEE',
      },
      create: {
        employeeId: 'EMP001',
        name: 'Rohan Sharma',
        mobile: '+919000000001',
        password: empHash,
        role: 'EMPLOYEE',
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 3. Login as Owner to get JWT
    const ownerLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ employeeId: 'owner', password: 'OwnerPass2026!' });
    ownerToken = ownerLoginRes.body.data.token;

    // 4. Login as Employee to get JWT
    const empLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ employeeId: 'EMP001', password: 'emp123' });
    employeeToken = empLoginRes.body.data.token;
  });

  afterAll(async () => {
    // Clean up any test bookings
    await prisma.bookingStation.deleteMany({});
    await prisma.bookingFoodItem.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.booking.deleteMany({
      where: { customerName: 'Test Sim Customer' },
    });
    await prisma.$disconnect();
  });

  it('1. GET /api/pricing returns pricing rules with all device types', async () => {
    const res = await request(app).get('/api/pricing');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const types = res.body.data.map((r: any) => r.deviceType);
    expect(types).toContain('PS5');
    expect(types).toContain('PS4');
    expect(types).toContain('PC');
    expect(types.some((t: string) => t === 'CAR_SIMULATOR' || t === 'SIMULATOR')).toBe(true);
  });

  it('2. PUT /api/pricing rejects unauthenticated requests', async () => {
    const res = await request(app)
      .put('/api/pricing')
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: 150 });
    expect(res.status).toBe(401);
  });

  it('3. PUT /api/pricing rejects unauthorized employee requests (403 Forbidden)', async () => {
    const res = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: 150 });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Owner access required');
  });

  it('4. PUT /api/pricing validates negative and non-numeric hourly rates', async () => {
    // Negative rate
    const negRes = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: -25 });
    expect(negRes.status).toBe(400);
    expect(negRes.body.error).toContain('greater than or equal to 0');

    // Non-numeric rate
    const nanRes = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: 'not-a-number' });
    expect(nanRes.status).toBe(400);
    expect(nanRes.body.error).toContain('valid number');

    // Missing rate
    const missingRes = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1 });
    expect(missingRes.status).toBe(400);
  });

  it('5. Owner can update CAR_SIMULATOR rate to ₹80 per 30 mins and it persists immediately in DB', async () => {
    const targetRate = 80;

    // Update Car Simulator price to 80
    const updateRes = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: targetRate });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.hourlyRate).toBe(targetRate);

    // Verify persistence via GET /api/pricing (simulating page refresh)
    const getRes = await request(app).get('/api/pricing');
    expect(getRes.status).toBe(200);
    const simRule = getRes.body.data.find(
      (r: any) => r.deviceType === 'CAR_SIMULATOR' && r.controllerCount === 1
    );
    expect(simRule).toBeDefined();
    expect(simRule.hourlyRate).toBe(targetRate);

    // Verify database record directly
    const dbRule = await prisma.pricingRule.findFirst({
      where: { deviceType: 'CAR_SIMULATOR', controllerCount: 1 },
    });
    expect(dbRule?.hourlyRate).toBe(targetRate);

    // Verify stations 5 & 6 use CAR_SIMULATOR
    const stations = await prisma.station.findMany({ where: { id: { in: [5, 6] } } });
    stations.forEach((st) => {
      expect(st.deviceType).toBe('CAR_SIMULATOR');
    });
  });

  it('6. Newly confirmed 30-minute booking on car simulator uses the correct ₹80 base rate', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 40 * 60 * 1000).toISOString(); // 30 minutes duration

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'Test Sim Customer',
        customerMobile: '9876543210',
        stationIds: [5], // Table 5: Car Simulator
        controllerCount: 1,
        startTime,
        endTime,
      });

    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;
    expect(booking.gamingAmount).toBe(80);
    expect(booking.grandTotal).toBe(80);
    expect(booking.stations[0].appliedRatePerHour).toBe(160); // 80 per 30 mins = 160 per hr
  });

  it('7. 60-minute car simulator booking uses ₹160 (2 units of 30 mins)', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 110 * 60 * 1000).toISOString(); // 60 minutes duration

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'Test Sim Customer 60m',
        customerMobile: '9876543211',
        stationIds: [6], // Table 6: Car Simulator
        controllerCount: 1,
        startTime,
        endTime,
      });

    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;
    expect(booking.gamingAmount).toBe(160);
    expect(booking.grandTotal).toBe(160);
    expect(booking.stations[0].appliedRatePerHour).toBe(160);
  });

  it('8. Changing car simulator rate to ₹95 updates subsequent bookings dynamically', async () => {
    // 1. Update to 95
    const updateRes = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'CAR_SIMULATOR', controllerCount: 1, hourlyRate: 95 });
    expect(updateRes.status).toBe(200);

    // 2. Create new 30-minute booking
    const now = new Date();
    const startTime = new Date(now.getTime() + 120 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 150 * 60 * 1000).toISOString(); // 30 minutes duration

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'Test Sim Customer 95',
        customerMobile: '9876543212',
        stationIds: [5],
        controllerCount: 1,
        startTime,
        endTime,
      });

    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;
    expect(booking.gamingAmount).toBe(95);
    expect(booking.grandTotal).toBe(95);
    expect(booking.stations[0].appliedRatePerHour).toBe(190);
  });

  it('9. Existing bookings preserve their historical booked rates after price change', async () => {
    // Check earlier 30m booking created at ₹80
    const prevBooking = await prisma.booking.findFirst({
      where: { customerName: 'Test Sim Customer' },
    });
    expect(prevBooking).toBeDefined();
    expect(prevBooking?.gamingAmount).toBe(80);
    expect(prevBooking?.grandTotal).toBe(80);
  });

  it('10. Other devices (PS5, PS4, PC) maintain their own rates accurately', async () => {
    // PS5 1P rate is 90/hr -> 30 mins session = 45
    const now = new Date();
    const startTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 40 * 60 * 1000).toISOString(); // 30 mins

    const ps5BookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerName: 'Test PS5 Customer',
        customerMobile: '9876543213',
        stationIds: [1], // Table 1: PS5
        controllerCount: 1,
        startTime,
        endTime,
      });

    expect(ps5BookingRes.status).toBe(201);
    expect(ps5BookingRes.body.data.gamingAmount).toBe(45); // 90 * 0.5 = 45
    expect(ps5BookingRes.body.data.stations[0].appliedRatePerHour).toBe(90);
  });

  it('11. Owner can update PS5, PS4, and PC pricing reliably', async () => {
    // Update PS5 2 controllers
    const ps5Res = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'PS5', controllerCount: 2, hourlyRate: 155 });
    expect(ps5Res.status).toBe(200);
    expect(ps5Res.body.data.hourlyRate).toBe(155);

    // Update PC
    const pcRes = await request(app)
      .put('/api/pricing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ deviceType: 'PC', controllerCount: 1, hourlyRate: 85 });
    expect(pcRes.status).toBe(200);
    expect(pcRes.body.data.hourlyRate).toBe(85);

    // Verify persistence
    const rulesRes = await request(app).get('/api/pricing');
    const ps5Rule = rulesRes.body.data.find(
      (r: any) => r.deviceType === 'PS5' && r.controllerCount === 2
    );
    const pcRule = rulesRes.body.data.find((r: any) => r.deviceType === 'PC');
    expect(ps5Rule.hourlyRate).toBe(155);
    expect(pcRule.hourlyRate).toBe(85);
  });

  it('12. Audit log records PRICING_UPDATE action with user and details', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { action: 'PRICING_UPDATE' },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].role).toBe('OWNER');
    expect(logs[0].userEmpId).toBe('owner');
  });
});
