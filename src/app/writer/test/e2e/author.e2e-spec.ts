import * as request from 'supertest';
import { IntegrationTestManager } from '../../../../../test/setup/IntegrationTestManager';

import { mockAuthor, mockUpdateAuthor } from './author.stub';
// import { logTrace } from '../../../../common/logger';
import { Endpoint } from '../../../../common/constants/model.consts';

describe('authors Controller (e2e)', () => {
  // let app;
  let userToken;
  const endPoint = Endpoint.Author;
  /**
   * this is integration test manager class that setups things like tokens
   */
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    await iTM.beforeAll('authors');
  });

  afterAll(async () => {
    await iTM.afterAll('authors');
  });

  it('authors-T01: FetchMany /authors (GET) to be empty', async () => {
    const response = await request(iTM.httpServer).get(`/${endPoint}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });

  it('authors-T02: CreateOne /authors (POST) UnAuthorized return 403', async () => {
    const response = await request(iTM.httpServer)
      .post(`/${endPoint}`)
      .send(mockAuthor)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403);
    expect(response.status).toBe(403);
  });

  let createdTag;

  it('authors-T03: CreateOne /authors (POST) Authorized -> 201', async () => {
    const response = await request(iTM.httpServer)
      .post(`/${endPoint}`)
      .send(mockAuthor)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(201);
    // logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe(mockAuthor.name);
    createdTag = response.body;
  });
  it('authors-T04: FetchMany /authors (GET) to have one author', async () => {
    const response = await request(iTM.httpServer).get(`/${endPoint}`).expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toEqual(1);
  });

  it('authors-T05: GetOne /authors (GET) to be same author', async () => {
    const response = await request(iTM.httpServer)
      .get(`/${endPoint}/${createdTag._id}`)
      .expect(200);

    // expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockAuthor.name);
  });

  it('authors-T06: UpdateOne /authors/:id (PATCH) -> 200', async () => {
    const response = await request(iTM.httpServer)
      .patch(`/${endPoint}/${createdTag._id}`)
      .send(mockUpdateAuthor)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockUpdateAuthor.name);
    // createdTag = response.body;
  });
  it('authors-T07: Delete /authors/:id (Delete) 200', async () => {
    const response = await request(iTM.httpServer)
      .delete(`/${endPoint}/${createdTag._id}`)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    // expect(response.body.name).toBe(mockUpdateTag.name);
    // createdTag = response.body;
  });

  it('authors-T08: FetchMany /authors (GET) to be empty, Verify Delete', async () => {
    const response = await request(iTM.httpServer).get(`/${endPoint}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });
});
