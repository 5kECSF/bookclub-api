import * as request from 'supertest';
import { IntegrationTestManager } from '../../../../../../test/setup/IntegrationTestManager';

import { mockBorrow, mockUpdateBorrow } from './borrow.stub';
// import { logTrace } from '../../../../common/logger';
import { Endpoint } from '../../../../../common/constants/model.consts';

describe('borrows Controller (e2e)', () => {
  // let app;
  let userToken;
  /**
   * this is integration test manager class that setups things like tokens
   */
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    await iTM.beforeAll('borrows');
  });

  afterAll(async () => {
    await iTM.afterAll('borrows');
  });

  it('borrows-T01: FetchMany /borrows (GET) to be empty', async () => {
    const response = await request(iTM.httpServer).get('/borrows');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });

  it('borrows-T02: CreateOne /borrows (POST) UnAuthorized return 403', async () => {
    const response = await request(iTM.httpServer)
      .post('/borrows')
      .send(mockBorrow)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403);
    expect(response.status).toBe(403);
  });

  let createdTag;

  it('borrows-T03: CreateOne /borrows (POST) Authorized -> 201', async () => {
    const response = await request(iTM.httpServer)
      .post(`/${Endpoint.Borrow}`)
      .send(mockBorrow)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(201);
    // logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe(mockBorrow.name);
    createdTag = response.body;
  });
  it('borrows-T04: FetchMany /borrows (GET) to have one borrow', async () => {
    const response = await request(iTM.httpServer).get(`/${Endpoint.Borrow}`).expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toEqual(1);
  });

  it('borrows-T05: GetOne /borrows (GET) to be same borrow', async () => {
    const response = await request(iTM.httpServer)
      .get(`/${Endpoint.Borrow}/${createdTag._id}`)
      .expect(200);

    // expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockBorrow.name);
  });

  it('borrows-T06: UpdateOne /borrows/:id (PATCH) -> 200', async () => {
    const response = await request(iTM.httpServer)
      .patch(`/${Endpoint.Borrow}/${createdTag._id}`)
      .send(mockUpdateBorrow)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(mockUpdateBorrow.name);
    // createdTag = response.body;
  });
  it('borrows-T07: Delete /borrows/:id (Delete) 200', async () => {
    const response = await request(iTM.httpServer)
      .delete(`/${Endpoint.Borrow}/${createdTag._id}`)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(200);
    // logTrace('response', response.body);
    expect(response.status).toBe(200);
    // expect(response.body.name).toBe(mockUpdateTag.name);
    // createdTag = response.body;
  });

  it('borrows-T08: FetchMany /borrows (GET) to be empty, Verify Delete', async () => {
    const response = await request(iTM.httpServer).get('/borrows');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });
});
