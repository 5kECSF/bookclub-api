import { Types } from 'mongoose';
import { createTestApp, TestContext } from './setup/test-app';
import { bookInput, createActiveBook, donate, getBook, getUser } from './support-helpers';

describe('book & donation (integration)', () => {
  let t: TestContext;
  beforeAll(async () => {
    t = await createTestApp({ taxonomy: true });
  });
  afterAll(async () => t?.close());

  describe('book', () => {
    let book: any;
    let draftOnly: any;

    it('only admins create/activate/update books', async () => {
      expect((await t.http().post('/book').send(bookInput('X'))).status).toBe(401);
      expect(
        (await t.http().post('/book').set('Authorization', t.tokens.reader).send(bookInput('X')))
          .status,
      ).toBe(403);
      const invalid = await t
        .http()
        .post('/book')
        .set('Authorization', t.tokens.admin)
        .send({ title: 'no desc' });
      expect(invalid.status).toBe(400);
    });

    it('create (draft) -> upload -> activate updates category/genre counts', async () => {
      book = await createActiveBook(t, 'Pride and Prejudice', {
        genres: ['Classic', 'Mystery'],
        meta: ['featured'],
      });
      expect(book.status).toBe('active');
      expect(book.upload.url).toMatch(/\/uploads\//);
      expect(book.uid).toBeDefined();
      expect(book.instanceCnt).toBe(0);
      expect(book.availableCnt).toBe(0);

      // activating twice must not double count
      await t.http().post(`/book/${book._id}`).set('Authorization', t.tokens.admin);
      const ctg = await t.http().get('/category').query({ name: 'Fiction' });
      expect(ctg.body.body[0].count).toBe(1);
      const gnr = await t.http().get('/genre').query({ name: 'Mystery' });
      expect(gnr.body.body[0].count).toBe(1);

      const draft = await t
        .http()
        .post('/book')
        .set('Authorization', t.tokens.admin)
        .send(bookInput('Draft Book'));
      expect(draft.status).toBe(201);
      expect(draft.body.status).toBe('draft');
      draftOnly = draft.body;
    });

    it('update is admin only and recomputes counts', async () => {
      const denied = await t
        .http()
        .patch(`/book/${book._id}`)
        .set('Authorization', t.tokens.reader)
        .send({ title: 'Hacked' });
      expect(denied.status).toBe(403);
      const res = await t
        .http()
        .patch(`/book/${book._id}`)
        .set('Authorization', t.tokens.admin)
        .send({ desc: 'A classic', genres: ['Classic'] });
      expect(res.status).toBe(200);
      expect(res.body.desc).toBe('A classic');
      expect(res.body.title).toBe('Pride and Prejudice');
      const gnr = await t.http().get('/genre').query({ name: 'Mystery' });
      expect(gnr.body.body[0].count).toBe(0);
      expect(
        (
          await t
            .http()
            .patch('/book/64b000000000000000000000')
            .set('Authorization', t.tokens.admin)
            .send({ desc: 'x' })
        ).status,
      ).toBe(404);
    });

    it('list filters: inStore, status, genres, meta, q, categoryName', async () => {
      // nothing available yet
      const inStore = await t.http().get('/book').query({ inStore: 'true' });
      expect(inStore.body.count).toBe(0);
      // absent or "false" -> no availability filter (the string "false" used to be truthy)
      const all = await t.http().get('/book').query({ inStore: 'false' });
      expect(all.body.count).toBe(2);
      const noParam = await t.http().get('/book');
      expect(noParam.body.count).toBe(2);
      expect(noParam.body).toEqual(expect.objectContaining({ hasNext: false, hasPrev: false }));
      const active = await t.http().get('/book').query({ status: 'active' });
      expect(active.body.body.map((b) => b._id)).toEqual([book._id]);
      const drafts = await t.http().get('/book').query({ status: 'draft', inStore: false });
      expect(drafts.body.body.map((b) => b._id)).toEqual([draftOnly._id]);
      expect((await t.http().get('/book').query({ genres: 'Classic' })).body.count).toBe(2);
      expect(
        (
          await t
            .http()
            .get('/book')
            .query({ genres: ['Mystery'] })
        ).body.count,
      ).toBe(0);
      expect((await t.http().get('/book').query({ meta: 'featured' })).body.count).toBe(1);
      expect((await t.http().get('/book').query({ q: 'pride' })).body.count).toBe(1);
      expect((await t.http().get('/book').query({ q: '(' })).status).toBe(200);
      expect(
        (await t.http().get('/book').query({ categoryName: 'Christian Living' })).body.count,
      ).toBe(0);
      const paged = await t.http().get('/book').query({ limit: 1, page: 1 });
      expect(paged.body).toEqual(
        expect.objectContaining({ count: 2, hasNext: true, hasPrev: false }),
      );
      const page2 = await t.http().get('/book').query({ limit: 1, page: 2 });
      expect(page2.body).toEqual(expect.objectContaining({ hasNext: false, hasPrev: true }));
    });

    it('like / dislike', async () => {
      await t.http().post(`/book/like/${book._id}`).set('Authorization', t.tokens.reader);
      expect((await getBook(t, book._id)).likesCount).toBe(1);
      await t.http().post(`/book/dislike/${book._id}`).set('Authorization', t.tokens.reader);
      const b = await getBook(t, book._id);
      expect(b.likesCount).toBe(0);
      expect(b.dislikesCount).toBe(1);
    });

    it('delete a book without donations (400 used to be a 500 when blocked)', async () => {
      expect(
        (await t.http().delete(`/book/${draftOnly._id}`).set('Authorization', t.tokens.reader))
          .status,
      ).toBe(403);
      const res = await t
        .http()
        .delete(`/book/${draftOnly._id}`)
        .set('Authorization', t.tokens.admin);
      expect(res.status).toBe(200);
      expect((await t.http().get(`/book/${draftOnly._id}`)).status).toBe(404);
    });
  });

  describe('donation', () => {
    let book: any;
    let d1: any;
    let d2: any;
    let d3: any;

    beforeAll(async () => {
      book = await createActiveBook(t, 'Mere Christianity', {
        categoryName: 'Christian Living',
        genres: ['Devotional'],
      });
    });

    it('create is admin only, defaults to AVAILABLE and updates counts', async () => {
      expect(
        (
          await t
            .http()
            .post('/donation')
            .set('Authorization', t.tokens.reader)
            .send({ bookId: book._id, donorId: t.ids.reader })
        ).status,
      ).toBe(403);
      d1 = await donate(t, book._id, t.ids.reader, { note: 'first copy' });
      expect(d1.status).toBe('AVAILABLE');
      expect(d1.instanceNo).toBe(1);
      expect(d1.uid).toBe(`${book.uid}-1`);
      expect(d1.bookName).toBe('Mere Christianity');
      expect(d1.donorName).toBe('Rita Reader');
      expect(d1.imgUrl).toBe(book.upload.url);
      d2 = await donate(t, book._id, t.ids.reader);
      d3 = await donate(t, book._id, t.ids.pending);
      const b = await getBook(t, book._id);
      expect(b.instanceCnt).toBe(3);
      expect(b.availableCnt).toBe(3);
      expect((await getUser(t, t.ids.reader)).donatedCount).toBe(2);
      expect((await getUser(t, t.ids.pending)).donatedCount).toBe(1);

      expect(
        (await t.http().get('/book').query({ inStore: true })).body.body.map((x) => x._id),
      ).toEqual([book._id]);

      const missing = await t
        .http()
        .post('/donation')
        .set('Authorization', t.tokens.admin)
        .send({ bookId: book._id, donorId: '64b000000000000000000000' });
      expect(missing.status).toBe(404);
      const locked = await t
        .http()
        .post('/donation')
        .set('Authorization', t.tokens.admin)
        .send({ bookId: book._id, donorId: t.ids.reader, status: 'TAKEN' });
      expect(locked.status).toBe(400);
    });

    it('donating to a book without image works', async () => {
      const draft = await t
        .http()
        .post('/book')
        .set('Authorization', t.tokens.admin)
        .send(bookInput('No Image'));
      const d = await donate(t, draft.body._id, t.ids.admin);
      expect(d.imgUrl).toBeUndefined();
      expect((await getBook(t, draft.body._id)).availableCnt).toBe(1);
      // books with donations can't be removed (400, not 500)
      const del = await t
        .http()
        .delete(`/book/${draft.body._id}`)
        .set('Authorization', t.tokens.admin);
      expect(del.status).toBe(400);
      expect(del.body.message).toMatch(/donation/);
    });

    it('list & get are public', async () => {
      const list = await t.http().get('/donation').query({ bookId: book._id });
      expect(list.body.count).toBe(3);
      expect((await t.http().get('/donation').query({ q: 'Mere' })).body.count).toBe(3);
      expect((await t.http().get(`/donation/${d1._id}`)).body._id).toBe(d1._id);
    });

    it('patch status / donor recomputes counts; RESERVED/TAKEN are workflow only', async () => {
      const res = await t
        .http()
        .patch(`/donation/${d2._id}`)
        .set('Authorization', t.tokens.admin)
        .send({ status: 'NOT_AVAILABLE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('NOT_AVAILABLE');
      let b = await getBook(t, book._id);
      expect(b.instanceCnt).toBe(3);
      expect(b.availableCnt).toBe(2);

      const back = await t
        .http()
        .patch(`/donation/${d2._id}`)
        .set('Authorization', t.tokens.admin)
        .send({ status: 'AVAILABLE' });
      expect(back.body.status).toBe('AVAILABLE');
      expect((await getBook(t, book._id)).availableCnt).toBe(3);

      const reserve = await t
        .http()
        .patch(`/donation/${d2._id}`)
        .set('Authorization', t.tokens.admin)
        .send({ status: 'RESERVED' });
      expect(reserve.status).toBe(409);

      const donor = await t
        .http()
        .patch(`/donation/${d3._id}`)
        .set('Authorization', t.tokens.admin)
        .send({ donorId: t.ids.admin });
      expect(donor.body.donorName).toBe('Ada Admin');
      expect((await getUser(t, t.ids.pending)).donatedCount).toBe(0);
      expect((await getUser(t, t.ids.admin)).donatedCount).toBe(2);

      expect(
        (
          await t
            .http()
            .patch(`/donation/${d3._id}`)
            .set('Authorization', t.tokens.reader)
            .send({ note: 'x' })
        ).status,
      ).toBe(403);
      b = await getBook(t, book._id);
      expect(b.availableCnt).toBe(3);
    });

    it('delete recomputes counts, instance numbers keep growing', async () => {
      const res = await t.http().delete(`/donation/${d2._id}`).set('Authorization', t.tokens.admin);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(d2._id);
      const b = await getBook(t, book._id);
      expect(b.instanceCnt).toBe(2);
      expect(b.availableCnt).toBe(2);
      expect((await getUser(t, t.ids.reader)).donatedCount).toBe(1);
      expect(
        (await t.http().delete(`/donation/${d2._id}`).set('Authorization', t.tokens.admin)).status,
      ).toBe(404);

      // count+1 would collide with the uid of instance #3
      const d4 = await donate(t, book._id, t.ids.reader);
      expect(d4.instanceNo).toBe(4);
      expect(d4.uid).toBe(`${book.uid}-4`);
    });

    it('a RESERVED/TAKEN copy cannot be deleted', async () => {
      await t.connection
        .collection('donations')
        .updateOne({ _id: new Types.ObjectId(d1._id) }, { $set: { status: 'RESERVED' } });
      const res = await t.http().delete(`/donation/${d1._id}`).set('Authorization', t.tokens.admin);
      expect(res.status).toBe(409);
    });

    it('stats', async () => {
      const stats = await t.http().get('/stats');
      expect(stats.status).toBe(200);
      expect(stats.body).toEqual({
        totalBooks: 3,
        totalDonations: 4,
        totalUsers: 3,
        activeBorrows: 0,
      });
      expect((await t.http().get('/stats/donors')).status).toBe(401);
      const donors = await t.http().get('/stats/donors').set('Authorization', t.tokens.admin);
      // donatedCount >= 1 (it was > 1, hiding single-copy donors)
      expect(donors.body.body.map((u) => u.email).sort()).toEqual([
        'admin@bookclub.test',
        'reader@bookclub.test',
      ]);
    });
  });
});
