import * as jwt from 'jsonwebtoken';
import { createTestApp, TestContext } from './setup/test-app';

describe('users & profile (integration)', () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => t?.close());

  describe('authentication vs authorization', () => {
    it('401 without/with an invalid/expired token, 403 for a wrong role', async () => {
      expect((await t.http().get('/users')).status).toBe(401);
      expect((await t.http().get('/users').set('Authorization', 'Bearer garbage')).status).toBe(
        401,
      );
      const expired = jwt.sign(
        { _id: t.ids.admin, role: 'ADMIN' },
        process.env.JWT_ACCESS_SECRET || 'some long secret',
        { expiresIn: -10 },
      );
      expect((await t.http().get('/users').set('Authorization', `Bearer ${expired}`)).status).toBe(
        401,
      );
      expect((await t.http().get('/users').set('Authorization', t.tokens.reader)).status).toBe(403);
      expect((await t.http().get('/profile')).status).toBe(401);
    });
  });

  describe('/users is admin only', () => {
    it('GET /users and GET /users/:id', async () => {
      const list = await t.http().get('/users').set('Authorization', t.tokens.admin);
      expect(list.status).toBe(200);
      expect(list.body).toEqual(
        expect.objectContaining({
          body: expect.any(Array),
          count: 3,
          hasNext: false,
          hasPrev: false,
        }),
      );
      expect(list.body.body[0].password).toBeUndefined();

      const filtered = await t
        .http()
        .get('/users')
        .query({ accountStatus: 'UN_APPROVED' })
        .set('Authorization', t.tokens.admin);
      expect(filtered.body.body.map((u) => u.email)).toEqual(['pending@bookclub.test']);

      const all = await t
        .http()
        .get('/users')
        .query({ accountStatus: '' })
        .set('Authorization', t.tokens.admin);
      expect(all.status).toBe(200);
      expect(all.body.count).toBe(3);

      const active = await t
        .http()
        .get('/users')
        .query({ active: 'true' })
        .set('Authorization', t.tokens.admin);
      expect(active.status).toBe(200);
      expect(active.body.count).toBe(3);

      const search = await t
        .http()
        .get('/users')
        .query({ q: 'rita' })
        .set('Authorization', t.tokens.admin);
      expect(search.body.body.map((u) => u.email)).toEqual(['reader@bookclub.test']);

      expect((await t.http().get(`/users/${t.ids.reader}`)).status).toBe(401);
      expect(
        (await t.http().get(`/users/${t.ids.reader}`).set('Authorization', t.tokens.reader)).status,
      ).toBe(403);
      const one = await t.http().get(`/users/${t.ids.reader}`).set('Authorization', t.tokens.admin);
      expect(one.status).toBe(200);
      expect(one.body.email).toBe('reader@bookclub.test');
    });

    it('POST /users (admin only)', async () => {
      const dto = {
        email: 'created@bookclub.test',
        password: 'Created@1234',
        firstName: 'Cre',
        lastName: 'Ated',
        role: 'ADMIN',
      };
      expect((await t.http().post('/users').send(dto)).status).toBe(401);
      expect(
        (await t.http().post('/users').set('Authorization', t.tokens.reader).send(dto)).status,
      ).toBe(403);
      const res = await t.http().post('/users').set('Authorization', t.tokens.admin).send(dto);
      expect(res.status).toBe(201);
      expect(res.body.active).toBe(false);
      const dup = await t.http().post('/users').set('Authorization', t.tokens.admin).send(dto);
      expect(dup.status).toBe(409);
    });

    it('approve a user with PATCH accountStatus ACTIVE (and no credential writes)', async () => {
      expect(
        (
          await t
            .http()
            .patch(`/users/${t.ids.pending}`)
            .set('Authorization', t.tokens.reader)
            .send({ accountStatus: 'ACTIVE' })
        ).status,
      ).toBe(403);
      const res = await t
        .http()
        .patch(`/users/${t.ids.pending}`)
        .set('Authorization', t.tokens.admin)
        .send({ accountStatus: 'ACTIVE', password: 'plain-text' });
      expect(res.status).toBe(200);
      expect(res.body.accountStatus).toBe('ACTIVE');
      // password wasn't overwritten with plain text: login still works
      expect(await t.login('pending@bookclub.test', 'Pending@1234')).toMatch(/^Bearer /);

      const bad = await t
        .http()
        .patch(`/users/${t.ids.pending}`)
        .set('Authorization', t.tokens.admin)
        .send({ accountStatus: 'SUPERUSER' });
      expect(bad.status).toBe(400);
    });

    it('PATCH /users/:id/resetPassword (admin) returns a new 6 digit password', async () => {
      const created = await t.connection
        .collection('users')
        .findOne({ email: 'created@bookclub.test' });
      const id = created._id.toString();
      expect(
        (await t.http().patch(`/users/${id}/resetPassword`).set('Authorization', t.tokens.reader))
          .status,
      ).toBe(403);
      const res = await t
        .http()
        .patch(`/users/${id}/resetPassword`)
        .set('Authorization', t.tokens.admin);
      expect(res.status).toBe(200);
      expect(res.text).toMatch(/^\d{6}$/);
      await t.connection
        .collection('users')
        .updateOne({ _id: created._id }, { $set: { active: true } });
      expect(await t.login('created@bookclub.test', res.text)).toMatch(/^Bearer /);
    });

    it('DELETE /users/:id (admin only)', async () => {
      const created = await t.connection
        .collection('users')
        .findOne({ email: 'created@bookclub.test' });
      const id = created._id.toString();
      expect((await t.http().delete(`/users/${id}`)).status).toBe(401);
      expect(
        (await t.http().delete(`/users/${id}`).set('Authorization', t.tokens.reader)).status,
      ).toBe(403);
      expect(
        (await t.http().delete(`/users/${id}`).set('Authorization', t.tokens.admin)).status,
      ).toBe(200);
      expect((await t.http().get(`/users/${id}`).set('Authorization', t.tokens.admin)).status).toBe(
        404,
      );
    });
  });

  describe('/profile', () => {
    it('GET /profile', async () => {
      const res = await t.http().get('/profile').set('Authorization', t.tokens.reader);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('reader@bookclub.test');
      expect(res.body.password).toBeUndefined();
    });

    it('PATCH /profile updates allowed fields and cannot escalate', async () => {
      const res = await t.http().patch('/profile').set('Authorization', t.tokens.reader).send({
        firstName: 'Rita',
        lastName: 'Updated',
        bio: 'I like books',
        team: 'Media',
        department: 'IT',
        phoneInfo: '911223344',
        role: 'ADMIN',
        accountStatus: 'BLOCKED',
        active: false,
        email: 'stolen@bookclub.test',
        donatedCount: 50,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          lastName: 'Updated',
          bio: 'I like books',
          team: 'Media',
          department: 'IT',
          phoneInfo: '911223344',
          role: 'USER',
          accountStatus: 'ACTIVE',
          active: true,
          email: 'reader@bookclub.test',
        }),
      );
      expect(res.body.donatedCount).toBeUndefined();

      const onlyBad = await t
        .http()
        .patch('/profile')
        .set('Authorization', t.tokens.reader)
        .send({ role: 'ADMIN' });
      expect(onlyBad.status).toBe(400);
      const doc = await t.connection.collection('users').findOne({ email: 'reader@bookclub.test' });
      expect(doc.role).toBe('USER');
    });

    it('PATCH /profile/changePassword', async () => {
      const wrong = await t
        .http()
        .patch('/profile/changePassword')
        .set('Authorization', t.tokens.reader)
        .send({ oldPassword: 'wrong-pass', newPassword: 'Reader@9999' });
      expect(wrong.status).toBe(400);
      const same = await t
        .http()
        .patch('/profile/changePassword')
        .set('Authorization', t.tokens.reader)
        .send({ oldPassword: 'Reader@1234', newPassword: 'Reader@1234' });
      expect(same.status).toBe(400);
      const ok = await t
        .http()
        .patch('/profile/changePassword')
        .set('Authorization', t.tokens.reader)
        .send({ oldPassword: 'Reader@1234', newPassword: 'Reader@9999' });
      expect(ok.status).toBe(200);
      expect(await t.login('reader@bookclub.test', 'Reader@9999')).toMatch(/^Bearer /);
    });
  });
});
