import { Types } from 'mongoose';
import { createTestApp, TestContext } from './setup/test-app';
import { createActiveBook, donate, getBook, getUser } from './support-helpers';

const days = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000).toISOString();

describe('borrow workflow (integration)', () => {
  let t: TestContext;
  let book: any;
  let otherBook: any;
  let copy1: any;
  let copy2: any;
  let otherCopy: any;
  let otherReader: { id: string; token: string };

  const borrowReq = (path: string, token = t.tokens.admin) =>
    t.http().post(`/borrow${path}`).set('Authorization', token);
  const getDonation = async (id: string) => (await t.http().get(`/donation/${id}`)).body;
  const myNotifications = async (token: string) =>
    (await t.http().get('/notification').set('Authorization', token)).body;

  beforeAll(async () => {
    t = await createTestApp({ taxonomy: true });
    book = await createActiveBook(t, 'The Hobbit');
    otherBook = await createActiveBook(t, 'The Silmarillion');
    copy1 = await donate(t, book._id, t.ids.admin);
    copy2 = await donate(t, book._id, t.ids.admin);
    otherCopy = await donate(t, otherBook._id, t.ids.admin);

    // a second active reader
    await t.http().post('/auth/register').send({
      email: 'second@bookclub.test',
      password: 'Second@1234',
      firstName: 'Sec',
      lastName: 'Ond',
    });
    const act = await t
      .http()
      .post('/auth/activate')
      .send({ phoneOrEmail: 'second@bookclub.test', code: '000000' });
    await t
      .http()
      .patch(`/users/${act.body._id}`)
      .set('Authorization', t.tokens.admin)
      .send({ accountStatus: 'ACTIVE' });
    otherReader = { id: act.body._id, token: await t.login('second@bookclub.test', 'Second@1234') };
  });
  afterAll(async () => t?.close());

  it('only ACTIVE accounts can request; unknown / draft books are rejected', async () => {
    expect((await t.http().post(`/borrow/request/${book._id}`)).status).toBe(401);
    expect((await borrowReq(`/request/${book._id}`, t.tokens.pending)).status).toBe(403);
    const missing = await borrowReq('/request/64b000000000000000000000', t.tokens.reader);
    expect(missing.status).toBe(404);
    const draft = await t
      .http()
      .post('/book')
      .set('Authorization', t.tokens.admin)
      .send({
        title: 'Draft',
        desc: 'd',
        categoryName: 'Fiction',
        genres: ['Classic'],
      });
    expect((await borrowReq(`/request/${draft.body._id}`, t.tokens.reader)).status).toBe(400);
  });

  let borrow: any;
  it('request -> WAITLIST (once per book)', async () => {
    const res = await borrowReq(`/request/${book._id}`, t.tokens.reader);
    expect(res.status).toBe(201);
    borrow = res.body.body;
    expect(borrow).toEqual(
      expect.objectContaining({
        status: 'WAITLIST',
        userId: t.ids.reader,
        bookId: book._id,
        bookName: 'The Hobbit',
        userName: 'Rita Reader',
        imgUrl: book.upload.url,
      }),
    );
    expect((await getUser(t, t.ids.reader)).requestedBooks).toEqual([book._id]);

    const dup = await borrowReq(`/request/${book._id}`, t.tokens.reader);
    expect(dup.status).toBe(409);
  });

  it('invalid transitions from WAITLIST are rejected', async () => {
    expect((await borrowReq(`/markTaken/${borrow._id}`).send({ dueDate: days(14) })).status).toBe(
      409,
    );
    expect((await borrowReq(`/markReturned/${borrow._id}`).send({})).status).toBe(409);
    // users can't accept
    expect(
      (
        await borrowReq(`/acceptBorrow/${borrow._id}`, t.tokens.reader).send({
          instanceId: copy1._id,
        })
      ).status,
    ).toBe(403);
  });

  it('accept validates the copy (exists, same book, available)', async () => {
    expect((await borrowReq(`/acceptBorrow/${borrow._id}`).send({})).status).toBe(400);
    expect(
      (
        await borrowReq(`/acceptBorrow/${borrow._id}`).send({
          instanceId: '64b000000000000000000000',
        })
      ).status,
    ).toBe(404);
    const wrongBook = await borrowReq(`/acceptBorrow/${borrow._id}`).send({
      instanceId: otherCopy._id,
    });
    expect(wrongBook.status).toBe(400);
    await t
      .http()
      .patch(`/donation/${copy2._id}`)
      .set('Authorization', t.tokens.admin)
      .send({ status: 'NOT_AVAILABLE' });
    const unavailable = await borrowReq(`/acceptBorrow/${borrow._id}`).send({
      instanceId: copy2._id,
    });
    expect(unavailable.status).toBe(409);
    await t
      .http()
      .patch(`/donation/${copy2._id}`)
      .set('Authorization', t.tokens.admin)
      .send({ status: 'AVAILABLE' });
    expect((await getBook(t, book._id)).availableCnt).toBe(2);
    expect(
      (await borrowReq('/acceptBorrow/64b000000000000000000000').send({ instanceId: copy1._id }))
        .status,
    ).toBe(404);
  });

  it('accept -> ACCEPTED, copy RESERVED, availableCnt recomputed, user notified', async () => {
    const res = await borrowReq(`/acceptBorrow/${borrow._id}`).send({
      instanceId: copy1._id,
      note: 'pick it up monday',
    });
    expect(res.status).toBe(201);
    expect(res.body.body).toEqual(
      expect.objectContaining({
        status: 'ACCEPTED',
        instanceId: copy1._id,
        instanceUid: copy1.uid,
        note: 'pick it up monday',
      }),
    );
    expect(res.body.body.acceptedDate).toBeDefined();
    const inst = await getDonation(copy1._id);
    expect(inst.status).toBe('RESERVED');
    expect(inst.borrowerId).toBe(t.ids.reader);
    expect(inst.borrowerName).toBe('Rita Reader');
    const b = await getBook(t, book._id);
    expect(b.availableCnt).toBe(1);
    expect(b.instanceCnt).toBe(2);
    const u = await getUser(t, t.ids.reader);
    expect(u.requestedBooks).toEqual([]);
    expect(u.approvedBooks).toEqual([book._id]);
    const notes = await myNotifications(t.tokens.reader);
    expect(notes.body.map((n) => n.title)).toContain(
      'Your request to borrow The Hobbit have been accepted',
    );

    // accepting again / cancelling is no longer possible
    expect(
      (await borrowReq(`/acceptBorrow/${borrow._id}`).send({ instanceId: copy2._id })).status,
    ).toBe(409);
    expect((await borrowReq(`/cancle/${borrow._id}`, t.tokens.reader)).status).toBe(409);
    expect((await borrowReq(`/markReturned/${borrow._id}`).send({})).status).toBe(409);
    // a reserved copy can't be accepted for another request
    const other = await borrowReq(`/request/${book._id}`, otherReader.token);
    const busy = await borrowReq(`/acceptBorrow/${other.body.body._id}`).send({
      instanceId: copy1._id,
    });
    expect(busy.status).toBe(409);
    // ...nor deleted
    expect(
      (await t.http().delete(`/donation/${copy1._id}`).set('Authorization', t.tokens.admin)).status,
    ).toBe(409);
  });

  it('markTaken validates dates', async () => {
    expect((await borrowReq(`/markTaken/${borrow._id}`).send({})).status).toBe(400);
    expect(
      (await borrowReq(`/markTaken/${borrow._id}`).send({ dueDate: 'not-a-date' })).status,
    ).toBe(400);
    const before = await borrowReq(`/markTaken/${borrow._id}`).send({
      takenDate: days(0),
      dueDate: days(-1),
    });
    expect(before.status).toBe(400);
    expect(before.body.message).toMatch(/dueDate must be after takenDate/);
    expect(
      (await borrowReq(`/markTaken/${borrow._id}`, t.tokens.reader).send({ dueDate: days(14) }))
        .status,
    ).toBe(403);
  });

  it('markTaken -> BORROWED, copy TAKEN, user notified', async () => {
    const res = await borrowReq(`/markTaken/${borrow._id}`).send({
      takenDate: days(-20),
      dueDate: days(-6),
    });
    expect(res.status).toBe(201);
    expect(res.body.body.status).toBe('BORROWED');
    expect(new Date(res.body.body.dueDate).getTime()).toBeLessThan(Date.now());
    expect((await getDonation(copy1._id)).status).toBe('TAKEN');
    expect((await getBook(t, book._id)).availableCnt).toBe(1);
    const u = await getUser(t, t.ids.reader);
    expect(u.approvedBooks).toEqual([]);
    expect(u.borrowedBooks).toEqual([book._id]);
    expect((await myNotifications(t.tokens.reader)).body.map((n) => n.title)).toContain(
      'The book The Hobbit is marked as taken by you',
    );
    expect((await borrowReq(`/markTaken/${borrow._id}`).send({ dueDate: days(14) })).status).toBe(
      409,
    );
    expect(
      (await borrowReq(`/acceptBorrow/${borrow._id}`).send({ instanceId: copy2._id })).status,
    ).toBe(409);
    expect(
      (await t.http().delete(`/borrow/${borrow._id}`).set('Authorization', t.tokens.admin)).status,
    ).toBe(409);
  });

  it('overdue listing is scoped to the user (and only BORROWED)', async () => {
    // the other reader's request gets accepted & taken with a past due date too
    const otherList = await t.http().get('/borrow').set('Authorization', otherReader.token);
    const otherBorrow = otherList.body.body[0];
    await borrowReq(`/acceptBorrow/${otherBorrow._id}`).send({ instanceId: copy2._id });
    await borrowReq(`/markTaken/${otherBorrow._id}`).send({
      takenDate: days(-30),
      dueDate: days(-2),
    });
    // a WAITLIST borrow with a past dueDate must not be listed as overdue
    await borrowReq(`/request/${otherBook._id}`, t.tokens.reader);
    await t.connection
      .collection('borrows')
      .updateOne({ bookId: otherBook._id }, { $set: { dueDate: new Date(Date.now() - 1e9) } });

    const mine = await t
      .http()
      .get('/borrow')
      .query({ overDue: 'true' })
      .set('Authorization', t.tokens.reader);
    expect(mine.status).toBe(200);
    expect(mine.body.body.map((b) => b._id)).toEqual([borrow._id]);
    // can't widen the scope with ?userId=
    const sneaky = await t
      .http()
      .get('/borrow')
      .query({ overDue: true, userId: otherReader.id })
      .set('Authorization', t.tokens.reader);
    expect(sneaky.body.body.map((b) => b._id)).toEqual([borrow._id]);
    const sneaky2 = await t
      .http()
      .get('/borrow')
      .query({ userId: otherReader.id })
      .set('Authorization', t.tokens.reader);
    expect(sneaky2.body.body.every((b) => b.userId === t.ids.reader)).toBe(true);

    const admin = await t
      .http()
      .get('/borrow')
      .query({ overDue: true })
      .set('Authorization', t.tokens.admin);
    expect(admin.body.count).toBe(2);
    const all = await t.http().get('/borrow').set('Authorization', t.tokens.admin);
    expect(all.body.count).toBe(3);
    expect(
      (
        await t
          .http()
          .get('/borrow')
          .query({ status: 'WAITLIST' })
          .set('Authorization', t.tokens.admin)
      ).body.count,
    ).toBe(1);
    expect(
      (await t.http().get(`/borrow/${borrow._id}`).set('Authorization', t.tokens.reader)).status,
    ).toBe(403);
    expect(
      (await t.http().get(`/borrow/${borrow._id}`).set('Authorization', t.tokens.admin)).body._id,
    ).toBe(borrow._id);
  });

  it('markReturned -> RETURNED (returnedDate defaults to now), copy AVAILABLE again', async () => {
    const res = await borrowReq(`/markReturned/${borrow._id}`).send({});
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('RETURNED');
    expect(Math.abs(new Date(res.body.returnedDate).getTime() - Date.now())).toBeLessThan(60_000);
    const inst = await getDonation(copy1._id);
    expect(inst.status).toBe('AVAILABLE');
    expect(inst.borrowerId).toBeUndefined();
    expect((await getBook(t, book._id)).availableCnt).toBe(1); // copy2 is still borrowed
    const u = await getUser(t, t.ids.reader);
    expect(u.borrowedBooks).toEqual([]);
    expect(u.returnedBooks).toEqual([book._id]);
    expect((await myNotifications(t.tokens.reader)).body.map((n) => n.title)).toContain(
      'The book The Hobbit is marked as Returned',
    );
    expect((await borrowReq(`/markReturned/${borrow._id}`).send({})).status).toBe(409);
    expect((await borrowReq(`/markTaken/${borrow._id}`).send({ dueDate: days(3) })).status).toBe(
      409,
    );
    // the book can be requested again once returned
    const again = await borrowReq(`/request/${book._id}`, t.tokens.reader);
    expect(again.status).toBe(201);
    borrow = again.body.body;
  });

  it('cancel: only the owner, only WAITLIST', async () => {
    expect((await borrowReq(`/cancle/${borrow._id}`, otherReader.token)).status).toBe(404);
    const res = await borrowReq(`/cancle/${borrow._id}`, t.tokens.reader);
    expect(res.status).toBe(201);
    expect(res.body.body._id).toBe(borrow._id);
    expect((await getUser(t, t.ids.reader)).requestedBooks).toEqual([otherBook._id]);
    expect((await borrowReq(`/cancel/${borrow._id}`, t.tokens.reader)).status).toBe(404);
  });

  it('admin rejects a WAITLIST request (DELETE /borrow/:id and POST /borrow/reject/:id)', async () => {
    const waiting = await t.connection
      .collection('borrows')
      .findOne({ bookId: otherBook._id, status: 'WAITLIST' });
    expect(
      (await t.http().delete(`/borrow/${waiting._id}`).set('Authorization', t.tokens.reader))
        .status,
    ).toBe(403);
    const res = await borrowReq(`/reject/${waiting._id}`).send({ note: 'no copies left' });
    expect(res.status).toBe(201);
    expect((await getUser(t, t.ids.reader)).requestedBooks).toEqual([]);
    const note = (await myNotifications(t.tokens.reader)).body.find((n) =>
      n.title.includes('rejected'),
    );
    expect(note.body).toBe('no copies left');

    const req = await borrowReq(`/request/${book._id}`, t.tokens.reader);
    const del = await t
      .http()
      .delete(`/borrow/${req.body.body._id}`)
      .set('Authorization', t.tokens.admin);
    expect(del.status).toBe(200);
    expect((await getUser(t, t.ids.reader)).requestedBooks).toEqual([]);
  });

  it('admin removing an ACCEPTED borrow releases the reserved copy', async () => {
    const req = await borrowReq(`/request/${book._id}`, t.tokens.reader);
    await borrowReq(`/acceptBorrow/${req.body.body._id}`).send({ instanceId: copy1._id });
    expect((await getBook(t, book._id)).availableCnt).toBe(0);
    const del = await t
      .http()
      .delete(`/borrow/${req.body.body._id}`)
      .set('Authorization', t.tokens.admin);
    expect(del.status).toBe(200);
    expect((await getDonation(copy1._id)).status).toBe('AVAILABLE');
    expect((await getBook(t, book._id)).availableCnt).toBe(1);
    expect((await getUser(t, t.ids.reader)).approvedBooks).toEqual([]);
  });

  it('a book without image can be requested', async () => {
    const draft = await t
      .http()
      .post('/book')
      .set('Authorization', t.tokens.admin)
      .send({
        title: 'No Cover',
        desc: 'd',
        categoryName: 'Fiction',
        genres: ['Classic'],
      });
    await t.connection
      .collection('books')
      .updateOne({ _id: new Types.ObjectId(draft.body._id) }, { $set: { status: 'active' } });
    const res = await borrowReq(`/request/${draft.body._id}`, t.tokens.reader);
    expect(res.status).toBe(201);
    expect(res.body.body.imgUrl).toBeUndefined();
  });

  it('stats count active borrows', async () => {
    expect((await t.http().get('/stats')).body.activeBorrows).toBe(1);
  });
});
