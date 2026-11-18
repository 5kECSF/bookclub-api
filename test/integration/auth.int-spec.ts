import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createTestApp, TestContext } from './setup/test-app';

const CODE = '000000';

describe('auth (integration)', () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => t?.close());

  const newUser = {
    email: 'newbie@bookclub.test',
    password: 'Newbie@1234',
    firstName: 'New',
    lastName: 'Bie',
    team: 'Choir',
  };

  it('never connects to anything but the local test container', () => {
    const conn = t.app.get<Connection>(getConnectionToken());
    expect(['localhost', '127.0.0.1', process.env.TEST_DB_ALLOWED_HOSTS]).toContain(conn.host);
    expect(conn.name).toMatch(/^bookclub_int_/);
  });

  it('register -> activate -> login -> resetTokens -> logout', async () => {
    const reg = await t.http().post('/auth/register').send(newUser);
    expect(reg.status).toBe(201);

    // not active yet: can't log in
    const early = await t
      .http()
      .post('/auth/login')
      .send({ info: newUser.email, password: newUser.password });
    expect(early.status).toBe(400);

    const wrong = await t
      .http()
      .post('/auth/activate')
      .send({ phoneOrEmail: newUser.email, code: '123456' });
    expect(wrong.status).toBe(400);

    const act = await t
      .http()
      .post('/auth/activate')
      .send({ phoneOrEmail: newUser.email, code: CODE });
    expect(act.status).toBe(201);
    expect(act.body.active).toBe(true);
    expect(act.body.accountStatus).toBe('UN_APPROVED');
    expect(act.body.role).toBe('USER');

    // the code is single use
    const again = await t
      .http()
      .post('/auth/activate')
      .send({ phoneOrEmail: newUser.email, code: CODE });
    expect(again.status).toBe(400);

    const login = await t
      .http()
      .post('/auth/login')
      .send({ info: newUser.email, password: newUser.password });
    expect(login.status).toBe(201);
    expect(login.body.authToken).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        sessionId: expect.any(String),
      }),
    );
    expect(login.body.userData.email).toBe(newUser.email);
    expect(login.body.userData.password).toBeUndefined();
    expect(login.body.userData.verificationCodeHash).toBeUndefined();
    expect(String(login.headers['set-cookie'])).toContain('REFRESH_TOKEN=');

    const me = await t
      .http()
      .get('/profile')
      .set('Authorization', `Bearer ${login.body.authToken.accessToken}`);
    expect(me.status).toBe(200);

    const refreshed = await t
      .http()
      .post('/auth/resetTokens')
      .send({ refreshToken: login.body.authToken.refreshToken });
    expect(refreshed.status).toBe(201);
    expect(refreshed.body.authToken.sessionId).toBe(login.body.authToken.sessionId);
    const refreshToken = refreshed.body.authToken.refreshToken;

    // the old refresh token was rotated out (tokens issued in the same second are identical)
    if (refreshToken !== login.body.authToken.refreshToken) {
      const reuse = await t
        .http()
        .post('/auth/resetTokens')
        .send({ refreshToken: login.body.authToken.refreshToken });
      expect(reuse.status).toBe(401);
    }

    // refresh through the cookie
    const viaCookie = await t
      .http()
      .post('/auth/resetTokens')
      .set('Cookie', `REFRESH_TOKEN=${refreshToken}`)
      .send({ isCookie: true });
    expect(viaCookie.status).toBe(201);

    const out = await t
      .http()
      .post('/auth/logout')
      .send({ refreshToken: viaCookie.body.authToken.refreshToken });
    expect(out.status).toBe(201);
    expect(out.text).toBe('true');

    // logged out: refresh is rejected with 401 (it used to be a 503)
    const after = await t
      .http()
      .post('/auth/resetTokens')
      .send({ refreshToken: viaCookie.body.authToken.refreshToken });
    expect(after.status).toBe(401);

    const missing = await t.http().post('/auth/resetTokens').send({});
    expect(missing.status).toBe(401);
  });

  it('registering an existing active account fails', async () => {
    const res = await t
      .http()
      .post('/auth/register')
      .send({ ...newUser, email: 'reader@bookclub.test' });
    expect(res.status).toBe(400);
  });

  it('register cannot escalate role / account status / active', async () => {
    const res = await t
      .http()
      .post('/auth/register')
      .send({
        email: 'evil@bookclub.test',
        password: 'Evil@12345',
        firstName: 'Evil',
        lastName: 'Doer',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        active: true,
        donatedCount: 99,
        requestedBooks: ['x'],
      });
    expect(res.status).toBe(201);
    const doc = await t.connection.collection('users').findOne({ email: 'evil@bookclub.test' });
    expect(doc.role).toBe('USER');
    expect(doc.active).toBe(false);
    expect(doc.accountStatus).toBe('REGISTERED');
    expect(doc.donatedCount).toBeUndefined();
    expect(doc.requestedBooks ?? []).toEqual([]);

    // can't log in without activation
    const login = await t
      .http()
      .post('/auth/login')
      .send({ info: 'evil@bookclub.test', password: 'Evil@12345' });
    expect(login.status).toBe(400);

    // activation gives a normal un-approved user
    const act = await t
      .http()
      .post('/auth/activate')
      .send({ phoneOrEmail: 'evil@bookclub.test', code: CODE });
    expect(act.body.role).toBe('USER');
    expect(act.body.accountStatus).toBe('UN_APPROVED');
  });

  it('forgot password -> reset password (wrong code is a 400, code is single use)', async () => {
    const unknown = await t
      .http()
      .post('/auth/forgotPassword')
      .send({ email: 'nobody@bookclub.test' });
    expect(unknown.status).toBe(404);

    const forgot = await t
      .http()
      .post('/auth/forgotPassword')
      .send({ email: 'reader@bookclub.test' });
    expect(forgot.status).toBe(201);

    // wrong code: used to answer `false` with a 201
    const bad = await t
      .http()
      .post('/auth/resetPassword')
      .send({ email: 'reader@bookclub.test', code: '999999', newPassword: 'Reader@5678' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/wrong|expired/i);

    const ok = await t
      .http()
      .post('/auth/resetPassword')
      .send({ email: 'reader@bookclub.test', code: CODE, newPassword: 'Reader@5678' });
    expect(ok.status).toBe(201);
    expect(ok.text).toBe('true');

    const reused = await t
      .http()
      .post('/auth/resetPassword')
      .send({ email: 'reader@bookclub.test', code: CODE, newPassword: 'Hacked@5678' });
    expect(reused.status).toBe(400);

    const oldPwd = await t
      .http()
      .post('/auth/login')
      .send({ info: 'reader@bookclub.test', password: 'Reader@1234' });
    expect(oldPwd.status).toBe(400);
    const newPwd = await t
      .http()
      .post('/auth/login')
      .send({ info: 'reader@bookclub.test', password: 'Reader@5678' });
    expect(newPwd.status).toBe(201);
  });

  it('nobody can reset a password without requesting a code first', async () => {
    const res = await t
      .http()
      .post('/auth/resetPassword')
      .send({ email: 'admin@bookclub.test', code: CODE, newPassword: 'Owned@1234' });
    expect(res.status).toBe(400);
  });

  it('change email with code + password', async () => {
    const token = await t.login('pending@bookclub.test', 'Pending@1234');
    const req = await t
      .http()
      .post('/auth/requestEmailChange')
      .set('Authorization', token)
      .send({ newEmail: 'pending2@bookclub.test' });
    expect(req.status).toBe(201);
    const badPwd = await t
      .http()
      .post('/auth/verifyUpdateEmail')
      .set('Authorization', token)
      .send({ code: CODE, password: 'nope-nope' });
    expect(badPwd.status).toBe(403);
    const ok = await t
      .http()
      .post('/auth/verifyUpdateEmail')
      .set('Authorization', token)
      .send({ code: CODE, password: 'Pending@1234' });
    expect(ok.status).toBe(201);
    const login = await t
      .http()
      .post('/auth/login')
      .send({ info: 'pending2@bookclub.test', password: 'Pending@1234' });
    expect(login.status).toBe(201);
  });
});
