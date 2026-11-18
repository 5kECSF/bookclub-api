import { makePng } from '../support/seed';
import { TestContext } from './setup/test-app';

export const bookInput = (title: string, extra: Record<string, any> = {}) => ({
  title,
  desc: `${title} description`,
  categoryName: 'Fiction',
  genres: ['Classic'],
  authorName: 'Some Author',
  language: 'English',
  pageNo: 200,
  ...extra,
});

/** creates a book draft, uploads its cover and activates it */
export async function createActiveBook(
  t: TestContext,
  title: string,
  extra: Record<string, any> = {},
) {
  const draft = await t
    .http()
    .post('/book')
    .set('Authorization', t.tokens.admin)
    .send(bookInput(title, extra));
  if (draft.status !== 201) throw new Error(`book create failed ${JSON.stringify(draft.body)}`);
  const up = await t
    .http()
    .post(`/file/${draft.body.fileId}`)
    .set('Authorization', t.tokens.admin)
    .attach('file', await makePng('#00aa00'), { filename: 'cover.png', contentType: 'image/png' });
  if (up.status !== 201) throw new Error(`upload failed ${JSON.stringify(up.body)}`);
  const act = await t.http().post(`/book/${draft.body._id}`).set('Authorization', t.tokens.admin);
  if (act.status !== 201) throw new Error(`activate failed ${JSON.stringify(act.body)}`);
  return act.body;
}

export async function donate(
  t: TestContext,
  bookId: string,
  donorId: string,
  extra: Record<string, any> = {},
) {
  const res = await t
    .http()
    .post('/donation')
    .set('Authorization', t.tokens.admin)
    .send({ bookId, donorId, ...extra });
  if (res.status !== 201)
    throw new Error(`donation failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function getBook(t: TestContext, id: string) {
  return (await t.http().get(`/book/${id}`)).body;
}

export async function getUser(t: TestContext, id: string) {
  return (await t.http().get(`/users/${id}`).set('Authorization', t.tokens.admin)).body;
}
