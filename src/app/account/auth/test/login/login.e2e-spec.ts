// users.e2e-spec.ts

import * as request from 'supertest';
import { adminLogin, defaultAdmin } from '../../../users/test/e2e/user.stub';
import { logTrace } from '../../../../../common/logger';
import { IntegrationTestManager } from '../../../../../../test/setup/IntegrationTestManager';

describe('UsersController (e2e)', () => {
  // let app;
  let userToken;
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    await iTM.beforeAll('users');
  });

  afterAll(async () => {
    await iTM.afterAll('users');
    // await iTM.getCollection('users').drop();
  });

  it('/users (POST) create user', async () => {
    const response = await request(iTM.httpServer)
      .post('/users')
      .send(defaultAdmin)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/);
    // .expect(400);
    // logTrace('response', response.body);
    expect(response.status).toBe(400);
    // expect(response.body.email).toEqual(adminUsr.email);
    // userToken = response.body.token; // Assuming your API returns a token upon registration
  });

  it('/auth/login (POST) login ', async () => {
    const response = await request(iTM.httpServer)
      .post('/auth/login')
      .send(adminLogin)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(201);
    logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.user.email).toEqual(defaultAdmin.email);
    expect(response.body.authToken.accessToken).toBeDefined();
    expect(response.body.authToken.refreshToken).toBeDefined();

    // userToken = response.body.token; // Assuming your API returns a token upon registration
  });

  it('/users (GET) with Auth', async () => {
    const response = await request(iTM.httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    // expect(Array.isArray(response.body)).toBe(true);
  });
});
