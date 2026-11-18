import { createTestApp, TestContext } from './setup/test-app';

describe('feedback & notifications (integration)', () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => t?.close());

  describe('feedback', () => {
    let fb: any;
    it('any logged in user can send feedback', async () => {
      expect((await t.http().post('/feedback').send({ title: 'hi' })).status).toBe(401);
      const res = await t
        .http()
        .post('/feedback')
        .set('Authorization', t.tokens.reader)
        .send({ title: 'Great library', body: 'thanks', userId: t.ids.admin });
      expect(res.status).toBe(201);
      fb = res.body;
      expect(fb).toEqual(
        expect.objectContaining({
          userId: t.ids.reader,
          email: 'reader@bookclub.test',
          userName: 'Rita Reader',
          seen: false,
        }),
      );
    });

    it('listing / reading is admin only (it had @Roles but no guard)', async () => {
      expect((await t.http().get('/feedback')).status).toBe(401);
      expect((await t.http().get('/feedback').set('Authorization', t.tokens.reader)).status).toBe(
        403,
      );
      expect((await t.http().get(`/feedback/${fb._id}`)).status).toBe(401);
      expect(
        (await t.http().get(`/feedback/${fb._id}`).set('Authorization', t.tokens.reader)).status,
      ).toBe(403);
      const list = await t.http().get('/feedback').set('Authorization', t.tokens.admin);
      expect(list.status).toBe(200);
      expect(list.body.count).toBe(1);
      expect(
        (await t.http().get(`/feedback/${fb._id}`).set('Authorization', t.tokens.admin)).body.title,
      ).toBe('Great library');
    });

    it('only the author edits his feedback; admins mark it seen', async () => {
      const other = await t
        .http()
        .patch(`/feedback/${fb._id}`)
        .set('Authorization', t.tokens.pending)
        .send({ title: 'pwned' });
      expect(other.status).toBe(404);
      const own = await t
        .http()
        .patch(`/feedback/${fb._id}`)
        .set('Authorization', t.tokens.reader)
        .send({ title: 'Great library!', seen: true, userId: t.ids.pending });
      expect(own.status).toBe(200);
      expect(own.body.title).toBe('Great library!');
      expect(own.body.seen).toBe(false);
      expect(own.body.userId).toBe(t.ids.reader);
      const seen = await t
        .http()
        .patch(`/feedback/${fb._id}`)
        .set('Authorization', t.tokens.admin)
        .send({ seen: true });
      expect(seen.body.seen).toBe(true);
      expect(
        (
          await t
            .http()
            .get('/feedback')
            .query({ seen: false })
            .set('Authorization', t.tokens.admin)
        ).body.count,
      ).toBe(0);
      expect(
        (await t.http().get('/feedback').query({ seen: true }).set('Authorization', t.tokens.admin))
          .body.count,
      ).toBe(1);
    });

    it('delete is admin only', async () => {
      expect(
        (await t.http().delete(`/feedback/${fb._id}`).set('Authorization', t.tokens.reader)).status,
      ).toBe(403);
      expect(
        (await t.http().delete(`/feedback/${fb._id}`).set('Authorization', t.tokens.admin)).status,
      ).toBe(200);
    });
  });

  describe('notifications', () => {
    let general: any;
    let forReader: any;
    let forPending: any;
    beforeAll(async () => {
      const mk = async (body: any) =>
        (await t.http().post('/notification').set('Authorization', t.tokens.admin).send(body)).body;
      general = await mk({ title: 'Library closed friday', body: 'holiday' });
      forReader = await mk({
        title: 'Reader only',
        body: 'secret',
        type: 'Individual',
        userId: t.ids.reader,
      });
      forPending = await mk({
        title: 'Pending only',
        body: 'secret',
        type: 'Individual',
        userId: t.ids.pending,
      });
    });

    it('only admins create', async () => {
      const res = await t
        .http()
        .post('/notification')
        .set('Authorization', t.tokens.reader)
        .send({ title: 'x', body: 'y' });
      expect(res.status).toBe(403);
      expect(general.type).toBe('General');
    });

    it('list shows general + own notifications, search cannot widen the scope', async () => {
      const list = await t.http().get('/notification').set('Authorization', t.tokens.reader);
      expect(list.body.body.map((n) => n.title).sort()).toEqual([
        'Library closed friday',
        'Reader only',
      ]);
      // `q` used to replace the scoping `$or`
      const search = await t
        .http()
        .get('/notification')
        .query({ q: 'only' })
        .set('Authorization', t.tokens.reader);
      expect(search.body.body.map((n) => n.title)).toEqual(['Reader only']);
      const sneaky = await t
        .http()
        .get('/notification')
        .query({ userId: t.ids.pending })
        .set('Authorization', t.tokens.reader);
      expect(sneaky.body.body.map((n) => n.title)).not.toContain('Pending only');
    });

    it("GET /notification/:id hides other users' notifications", async () => {
      expect(
        (await t.http().get(`/notification/${general._id}`).set('Authorization', t.tokens.reader))
          .status,
      ).toBe(200);
      expect(
        (await t.http().get(`/notification/${forReader._id}`).set('Authorization', t.tokens.reader))
          .status,
      ).toBe(200);
      expect(
        (
          await t
            .http()
            .get(`/notification/${forPending._id}`)
            .set('Authorization', t.tokens.reader)
        ).status,
      ).toBe(404);
      expect(
        (await t.http().get(`/notification/${forPending._id}`).set('Authorization', t.tokens.admin))
          .status,
      ).toBe(200);
      expect((await t.http().get(`/notification/${forPending._id}`)).status).toBe(401);
    });
  });

  it('GET / health', async () => {
    expect((await t.http().get('/')).text).toBe('Hello World!');
  });
});
