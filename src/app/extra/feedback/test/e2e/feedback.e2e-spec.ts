import * as request from 'supertest';
import { IntegrationTestManager } from '../../../../../../test/setup/IntegrationTestManager';

import { feedbackMock } from './feedback.stub';
import { logTrace } from '../../../../../common/logger';

describe('feedbacks Controller (e2e)', () => {
  // let app;
  let userToken;
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    await iTM.beforeAll('feedbacks');
  });

  afterAll(async () => {
    await iTM.afterAll('feedbacks');
  });

  it('/users (GET) to be empty', async () => {
    const response = await request(iTM.httpServer).get('/feedbacks');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(0);
  });

  it('/feedbacks (POST) Un Authorized', async () => {
    const response = await request(iTM.httpServer)
      .post('/feedbacks')
      .send(feedbackMock)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.status).toBe(403);
  });

  it('/feedbacks (POST) Authorized', async () => {
    const response = await request(iTM.httpServer)
      .post('/feedbacks')
      .send(feedbackMock)
      .set('Accept', 'application/json')
      .set('Authorization', iTM.adminAccessToken)
      .expect('Content-Type', /json/)
      .expect(201);
    logTrace('response', response.body);
    expect(response.status).toBe(201);

    // userToken = response.body.token; // Assuming your API returns a token upon registration
  });

  it('/feedbacks (GET) to have one feedback', async () => {
    const response = await request(iTM.httpServer).get('/feedbacks').expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toEqual(1);
  });
});
