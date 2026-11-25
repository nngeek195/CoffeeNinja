import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { app } from '../index';
import { prisma } from '../utils/prisma';

const RUN_ID = Date.now();

async function loginAs(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.token as string;
}

describe('Inquiry API', () => {
  let aliceToken: string;
  let bobToken: string;
  let adminToken: string;
  let aliceInquiryId: string;
  const createdIds: string[] = [];

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function createInquiry(token: string, subject: string) {
    const res = await request(app)
      .post('/api/inquiries')
      .set(auth(token))
      .send({
        customerName: 'Test Customer',
        customerContact: 'test.customer@example.com',
        subject,
        description: 'Testing backend ownership and validation rules.',
      });
    if (res.body.inquiry) createdIds.push(res.body.inquiry.id);
    return res;
  }

  beforeAll(async () => {
    [aliceToken, bobToken, adminToken] = await Promise.all([
      loginAs('alice@coffeeninja.lk'),
      loginAs('bob@coffeeninja.lk'),
      loginAs('admin@coffeeninja.lk'),
    ]);

    const created = await createInquiry(aliceToken, `Access Test ${RUN_ID}`);
    aliceInquiryId = created.body.inquiry.id;
  });

  afterAll(async () => {
    await prisma.inquiry.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  describe('authentication and access control', () => {
    it('rejects requests without a token (401)', async () => {
      const res = await request(app).get('/api/inquiries');
      expect(res.status).toBe(401);
    });

    it('rejects requests with an invalid token (401)', async () => {
      const res = await request(app).get('/api/inquiries').set(auth('not-a-real-token'));
      expect(res.status).toBe(401);
    });

    it('rejects wrong credentials (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@coffeeninja.lk', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('blocks a staff member from viewing another staff member’s inquiry (403)', async () => {
      const res = await request(app).get(`/api/inquiries/${aliceInquiryId}`).set(auth(bobToken));
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/permission/i);
    });

    it('blocks a staff member from updating another staff member’s inquiry (403)', async () => {
      const res = await request(app)
        .patch(`/api/inquiries/${aliceInquiryId}/status`)
        .set(auth(bobToken))
        .send({ status: 'IN_PROGRESS', version: 1 });
      expect(res.status).toBe(403);
    });

    it('only lists a staff member’s own inquiries', async () => {
      const res = await request(app).get('/api/inquiries').set(auth(bobToken));
      expect(res.status).toBe(200);
      const ids = res.body.inquiries.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(aliceInquiryId);
    });

    it('lets an admin list and view any inquiry', async () => {
      const list = await request(app).get('/api/inquiries').set(auth(adminToken));
      expect(list.body.inquiries.map((i: { id: string }) => i.id)).toContain(aliceInquiryId);

      const detail = await request(app).get(`/api/inquiries/${aliceInquiryId}`).set(auth(adminToken));
      expect(detail.status).toBe(200);
      expect(detail.body.inquiry.id).toBe(aliceInquiryId);
    });
  });

  describe('identifiers', () => {
    it('rejects a malformed inquiry ID (400)', async () => {
      const res = await request(app).get('/api/inquiries/not-a-uuid').set(auth(aliceToken));
      expect(res.status).toBe(400);
    });

    it('returns 404 for an inquiry that does not exist', async () => {
      const res = await request(app).get(`/api/inquiries/${randomUUID()}`).set(auth(aliceToken));
      expect(res.status).toBe(404);
    });
  });

  describe('validation and duplicates', () => {
    it('rejects missing or invalid inquiry input (400)', async () => {
      const res = await request(app)
        .post('/api/inquiries')
        .set(auth(aliceToken))
        .send({ customerName: 'A', customerContact: 'abcdef', subject: 'Hi', description: 'Too short' });

      expect(res.status).toBe(400);
      expect(Object.keys(res.body.details)).toEqual(
        expect.arrayContaining(['customerName', 'customerContact', 'subject', 'description'])
      );
    });

    it('rejects a malformed JSON body (400)', async () => {
      const res = await request(app)
        .post('/api/inquiries')
        .set(auth(aliceToken))
        .set('Content-Type', 'application/json')
        .send('{"customerName": ');
      expect(res.status).toBe(400);
    });

    it('rejects a duplicate active inquiry with the same contact and subject (409)', async () => {
      const res = await createInquiry(aliceToken, `access test ${RUN_ID}`);
      expect(res.status).toBe(409);
    });

    it('rejects an unknown status value (400)', async () => {
      const res = await request(app)
        .patch(`/api/inquiries/${aliceInquiryId}/status`)
        .set(auth(aliceToken))
        .send({ status: 'CLOSED', version: 1 });
      expect(res.status).toBe(400);
      expect(res.body.details.status[0]).toMatch(/NEW, IN_PROGRESS, or RESOLVED/);
    });
  });

  describe('lifecycle and concurrency', () => {
    it('rejects skipping straight from NEW to RESOLVED (400)', async () => {
      const res = await request(app)
        .patch(`/api/inquiries/${aliceInquiryId}/status`)
        .set(auth(aliceToken))
        .send({ status: 'RESOLVED', version: 1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot transition/i);
    });

    it('moves forward through the lifecycle, rejects stale versions, and never reopens', async () => {
      const created = await createInquiry(aliceToken, `Lifecycle ${RUN_ID}`);
      const id = created.body.inquiry.id;
      const patch = (status: string, version: number) =>
        request(app).patch(`/api/inquiries/${id}/status`).set(auth(aliceToken)).send({ status, version });

      const toInProgress = await patch('IN_PROGRESS', 1);
      expect(toInProgress.status).toBe(200);
      expect(toInProgress.body.inquiry).toMatchObject({ status: 'IN_PROGRESS', version: 2 });

      const staleTab = await patch('RESOLVED', 1);
      expect(staleTab.status).toBe(409);
      expect(staleTab.body.code).toBe('STALE_DATA');

      const toResolved = await patch('RESOLVED', 2);
      expect(toResolved.status).toBe(200);
      expect(toResolved.body.inquiry).toMatchObject({ status: 'RESOLVED', version: 3 });

      const reopen = await patch('IN_PROGRESS', 3);
      expect(reopen.status).toBe(400);
    });

    it('lets only one of two concurrent updates with the same version succeed', async () => {
      const created = await createInquiry(aliceToken, `Concurrency ${RUN_ID}`);
      const id = created.body.inquiry.id;
      const send = () =>
        request(app)
          .patch(`/api/inquiries/${id}/status`)
          .set(auth(aliceToken))
          .send({ status: 'IN_PROGRESS', version: 1 });

      const statuses = (await Promise.all([send(), send()])).map((r) => r.status).sort();
      expect(statuses).toEqual([200, 409]);
    });
  });
});
