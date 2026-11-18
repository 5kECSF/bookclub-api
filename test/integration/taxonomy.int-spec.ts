import { existsSync } from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { makePng } from '../support/seed';
import { createTestApp, TestContext } from './setup/test-app';

/** draft -> upload a real PNG through POST /file/:fileId (LOCAL storage) -> activate */
async function createActive(t: TestContext, route: string, body: Record<string, any>) {
  const draft = await t
    .http()
    .post(`/${route}/draft`)
    .set('Authorization', t.tokens.admin)
    .send(body);
  expect(draft.status).toBe(201);
  expect(draft.body.status).toBe('draft');
  expect(draft.body.fileId).toEqual(expect.any(String));

  const png = await makePng('#ff0000', 1200);
  const up = await t
    .http()
    .post(`/file/${draft.body.fileId}`)
    .set('Authorization', t.tokens.admin)
    .attach('file', png, { filename: 'cover image.png', contentType: 'image/png' });
  expect(up.status).toBe(201);
  expect(up.body.status).toBe('uploaded');
  expect(up.body.url).toMatch(/\/uploads\/.+\.png$/);

  const act = await t
    .http()
    .post(`/${route}/${draft.body._id}`)
    .set('Authorization', t.tokens.admin);
  expect(act.status).toBe(201);
  expect(act.body.status).toBe('active');
  expect(act.body.upload.url).toBe(up.body.url);
  return act.body;
}

describe('category / genre / author (integration)', () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => t?.close());

  it('uploaded images are resized, written to UPLOAD_DIR and served under /uploads', async () => {
    const ctg = await createActive(t, 'category', { name: 'Poetry', desc: 'poems' });
    const file = path.join(process.env.UPLOAD_DIR, ctg.upload.fileName);
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(file).metadata();
    expect(meta.width).toBe(1000); // 1200px wide upload resized

    const served = await t.http().get(`/uploads/${encodeURIComponent(ctg.upload.fileName)}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect((await t.http().get('/uploads/does-not-exist.png')).status).toBe(404);
  });

  it('rejects non images and uploads to someone else/unknown drafts', async () => {
    const draft = await t
      .http()
      .post('/category/draft')
      .set('Authorization', t.tokens.admin)
      .send({ name: 'Txt' });
    const txt = await t
      .http()
      .post(`/file/${draft.body.fileId}`)
      .set('Authorization', t.tokens.admin)
      .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(txt.status).toBe(415);
    const other = await t
      .http()
      .post(`/file/${draft.body.fileId}`)
      .set('Authorization', t.tokens.reader)
      .attach('file', await makePng(), { filename: 'a.png', contentType: 'image/png' });
    expect(other.status).toBe(404);
    expect((await t.http().post(`/file/${draft.body.fileId}`)).status).toBe(401);
  });

  describe.each([
    ['category', { name: 'History', desc: 'old things' }, { desc: 'updated desc' }],
    [
      'genre',
      { name: 'Biography', categories: ['History'], desc: 'lives' },
      { desc: 'updated desc' },
    ],
    ['author', { name: 'C. S. Lewis', bio: 'Narnia' }, { bio: 'updated bio' }],
  ])('%s CRUD', (route, createBody, patchBody) => {
    let item: any;

    it('only admins can create/activate/update/delete', async () => {
      expect((await t.http().post(`/${route}/draft`).send(createBody)).status).toBe(401);
      expect(
        (
          await t
            .http()
            .post(`/${route}/draft`)
            .set('Authorization', t.tokens.reader)
            .send(createBody)
        ).status,
      ).toBe(403);
    });

    it('draft + upload + activate', async () => {
      item = await createActive(t, route, createBody);
      expect(item.name).toBe(createBody.name);
      expect(item.slug).toEqual(expect.any(String));
    });

    it('list (paginated) & get one', async () => {
      const list = await t
        .http()
        .get(`/${route}`)
        .query({ q: createBody.name.slice(0, 4) });
      expect(list.status).toBe(200);
      expect(list.body).toEqual(
        expect.objectContaining({ count: 1, hasNext: false, hasPrev: false }),
      );
      expect(list.body.body[0]._id).toBe(item._id);
      const active = await t.http().get(`/${route}`).query({ status: 'active' });
      expect(active.body.body.map((x) => x._id)).toContain(item._id);
      const one = await t.http().get(`/${route}/${item._id}`);
      expect(one.status).toBe(200);
      expect(one.body.name ?? one.body.body?.name).toBe(createBody.name);
    });

    it('update', async () => {
      expect(
        (
          await t
            .http()
            .patch(`/${route}/${item._id}`)
            .set('Authorization', t.tokens.reader)
            .send(patchBody)
        ).status,
      ).toBe(403);
      const res = await t
        .http()
        .patch(`/${route}/${item._id}`)
        .set('Authorization', t.tokens.admin)
        .send(patchBody);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining(patchBody));
    });

    it('delete removes the record and its files', async () => {
      const file = path.join(process.env.UPLOAD_DIR, item.upload.fileName);
      expect(existsSync(file)).toBe(true);
      expect(
        (await t.http().delete(`/${route}/${item._id}`).set('Authorization', t.tokens.reader))
          .status,
      ).toBe(403);
      const res = await t
        .http()
        .delete(`/${route}/${item._id}`)
        .set('Authorization', t.tokens.admin);
      expect(res.status).toBe(200);
      expect((await t.http().get(`/${route}/${item._id}`)).status).toBe(404);
      expect(existsSync(file)).toBe(false);
    });

    it('a draft without uploaded file can still be deleted', async () => {
      const draft = await t
        .http()
        .post(`/${route}/draft`)
        .set('Authorization', t.tokens.admin)
        .send({ ...createBody, name: `${createBody.name} 2` });
      const res = await t
        .http()
        .delete(`/${route}/${draft.body._id}`)
        .set('Authorization', t.tokens.admin);
      expect(res.status).toBe(200);
    });
  });
});
