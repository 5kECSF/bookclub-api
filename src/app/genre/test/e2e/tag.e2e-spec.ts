import * as request from 'supertest';
import { IntegrationTestManager } from '../../../../../test/setup/IntegrationTestManager';

import { mockTag, mockUpdateTag } from './tag.stub';
// import { logTrace } from '../../../../common/logger';
import { Endpoint } from '../../../../common/constants/modelConsts';

describe('tags Controller (e2e)', () => {
  // let app;
  let userToken;
  /**
   * this is integration test manager class that setups things like
   */
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    await iTM.beforeAll('tags');
  });

  afterAll(async () => {
    await iTM.afterAll('tags');
  });

  it('tags-T01: FetchMany /tags (GET) to be empty', async () => {
    const response = await request(iTM.httpServer).get('/tags');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });

  it('tags-T02: CreateOne /tags (POST) UnAuthorized return 403', async () => {
    const response = await request(iTM.httpServer)
      .post('/tags')
      .send(mockTag)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403);
    expect(response.status).toBe(403);
  });

  let createdTag;

  it('tags-T03: CreateOne /tags (POST) Authorized -> 201', async () => {
    const response = await request(iTM.httpServer)
      .post(`/${Endpoint.Genre}`)
      .send(mockTag)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(201);
    // logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe(mockTag.name);
    createdTag = response.body;
  });
  it('tags-T04: FetchMany /tags (GET) to have one tag', async () => {
    const response = await request(iTM.httpServer).get(`/${Endpoint.Genre}`).expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toEqual(1);
  });

  it('tags-T05: GetOne /tags (GET) to be same tag', async () => {
    const response = await request(iTM.httpServer)
      .get(`/${Endpoint.Genre}/${createdTag._id}`)
      .expect(200);

    // expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockTag.name);
  });

  it('tags-T06: UpdateOne /tags/:id (PATCH) -> 200', async () => {
    const response = await request(iTM.httpServer)
      .patch(`/${Endpoint.Genre}/${createdTag._id}`)
      .send(mockUpdateTag)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockUpdateTag.name);
    // createdTag = response.body;
  });
  it('tags-T07: Delete /tags/:id (Delete) 200', async () => {
    const response = await request(iTM.httpServer)
      .delete(`/${Endpoint.Genre}/${createdTag._id}`)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    // expect(response.body.name).toBe(mockUpdateTag.name);
    // createdTag = response.body;
  });

  it('tags-T08: FetchMany /tags (GET) to be empty, Verify Delete', async () => {
    const response = await request(iTM.httpServer).get('/tags');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });
});
