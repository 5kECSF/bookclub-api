import * as request from 'supertest';
import { IntegrationTestManager } from '../../../../../test/setup/IntegrationTestManager';

import { mockGenre, mockUpdateGenre } from './genre.stub';
// import { logTrace } from '../../../../common/logger';
import { Endpoint } from '../../../../common/constants/model.consts';

describe('genres Controller (e2e)', () => {
  // let app;
  let userToken;
  const endPoint = Endpoint.Genre;
  /**
   * this is integration test manager class that setups things like tokens
   */
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    await iTM.beforeAll('genres');
  });

  afterAll(async () => {
    await iTM.afterAll('genres');
  });

  it('genres-T01: FetchMany /genres (GET) to be empty', async () => {
    const response = await request(iTM.httpServer).get(`/${endPoint}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });

  it('genres-T02: CreateOne /genres (POST) UnAuthorized return 403', async () => {
    const response = await request(iTM.httpServer)
      .post(`/${endPoint}`)
      .send(mockGenre)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403);
    expect(response.status).toBe(403);
  });

  let createdTag;

  it('genres-T03: CreateOne /genres (POST) Authorized -> 201', async () => {
    const response = await request(iTM.httpServer)
      .post(`/${endPoint}`)
      .send(mockGenre)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(201);
    // logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe(mockGenre.name);
    createdTag = response.body;
  });
  it('genres-T04: FetchMany /genres (GET) to have one genre', async () => {
    const response = await request(iTM.httpServer).get(`/${endPoint}`).expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toEqual(1);
  });

  it('genres-T05: GetOne /genres (GET) to be same genre', async () => {
    const response = await request(iTM.httpServer)
      .get(`/${endPoint}/${createdTag._id}`)
      .expect(200);

    // expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockGenre.name);
  });

  it('genres-T06: UpdateOne /genres/:id (PATCH) -> 200', async () => {
    const response = await request(iTM.httpServer)
      .patch(`/${endPoint}/${createdTag._id}`)
      .send(mockUpdateGenre)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockUpdateGenre.name);
    // createdTag = response.body;
  });
  it('genres-T07: Delete /genres/:id (Delete) 200', async () => {
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

  it('genres-T08: FetchMany /genres (GET) to be empty, Verify Delete', async () => {
    const response = await request(iTM.httpServer).get(`/${endPoint}`);
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });
});
