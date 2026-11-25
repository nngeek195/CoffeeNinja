import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../utils/prisma';

describe('Inquiry API Security & Validation Rules', () => {
  let aliceToken: string;
  let bobToken: string;
  let aliceInquiryId: string;

  beforeAll(async () => {
    // Sign in as seeded staff accounts
    const aliceLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@coffeeninja.lk', password: 'password123' });
    aliceToken = aliceLogin.body.token;

    const bobLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@coffeeninja.lk', password: 'password123' });
    bobToken = bobLogin.body.token;

    // Create a fresh inquiry owned by Alice for access testing
    const created = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        customerName: 'Test Customer',
        customerContact: 'test.customer@example.com',
        subject: `Access Test Subject ${Date.now()}`,
        description: 'Testing backend ownership and validation rules.',
      });
    aliceInquiryId = created.body.inquiry.id;
  });

  afterAll(async () => {
    if (aliceInquiryId) {
      await prisma.inquiry.delete({ where: { id: aliceInquiryId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/inquiries');
    expect(res.status).toBe(401);
  });

  it('prevents a staff member from viewing another staff member’s inquiry (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/inquiries/${aliceInquiryId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/permission/i);
  });

  it('independently rejects missing or invalid inquiry input with 400', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        customerName: 'A',
        customerContact: '123',
        subject: 'Hi',
        description: 'Too short',
      });

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('customerName');
    expect(res.body.details).toHaveProperty('description');
  });

  it('rejects invalid lifecycle transition directly from NEW to RESOLVED (400)', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${aliceInquiryId}/status`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'RESOLVED', version: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot transition/i);
  });
});