import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

describe('BroCode API Authentication and Authorization Tests', () => {
  let ownerToken: string;
  let ownerId: string;

  beforeAll(async () => {
    // Ensure owner has temporary credentials for testing
    const hash = await bcrypt.hash('owner123', 10);
    const owner = await prisma.user.update({
      where: { employeeId: 'owner' },
      data: {
        password: hash,
        mustChangePassword: true,
        isActive: true,
      },
    });
    ownerId = owner.id;
  });

  afterAll(async () => {
    // Ensure owner retains the required temporary credentials owner / owner123 and mustChangePassword = true
    const hash = await bcrypt.hash('owner123', 10);
    await prisma.user.update({
      where: { id: ownerId },
      data: {
        employeeId: 'owner',
        password: hash,
        mustChangePassword: true,
        isActive: true,
      },
    });
    await prisma.$disconnect();
  });

  it('GET /health returns 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('BroCode');
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ employeeId: 'owner', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/login accepts temporary credentials owner/owner123', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ employeeId: 'owner', password: 'owner123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.employeeId).toBe('owner');
    expect(res.body.data.user.role).toBe('OWNER');
    expect(res.body.data.user.mustChangePassword).toBe(true);

    ownerToken = res.body.data.token;
  });

  it('GET /api/employees rejects unauthorized requests', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  it('GET /api/employees allows Owner with valid token', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/auth/change-password validates current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        currentPassword: 'wrongCurrentPassword',
        newPassword: 'NewSecurePass2026',
        confirmPassword: 'NewSecurePass2026',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Current password is incorrect');
  });

  it('POST /api/auth/change-password validates password policy', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        currentPassword: 'owner123',
        newPassword: 'weak',
        confirmPassword: 'weak',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('requirements');
  });

  it('POST /api/auth/change-password succeeds with compliant password and updates mustChangePassword', async () => {
    const newPass = 'OwnerPass2026!';
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        currentPassword: 'owner123',
        newPassword: newPass,
        confirmPassword: newPass,
      });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.mustChangePassword).toBe(false);

    // Verify DB state
    const userInDb = await prisma.user.findUnique({ where: { id: ownerId } });
    expect(userInDb?.mustChangePassword).toBe(false);

    // Verify login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ employeeId: 'owner', password: newPass });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.mustChangePassword).toBe(false);
  });
});
