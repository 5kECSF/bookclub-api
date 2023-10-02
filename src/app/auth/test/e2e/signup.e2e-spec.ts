// users.e2e-spec.ts

import * as request from 'supertest';
import { regUsr, verifyInput } from './auth.stub';

import { IntegrationTestManager } from '../../../../../test/setup/IntegrationTestManager';
import { RespConst } from '../../../../common/constants/response.consts';

describe('Signup Controller (e2e)', () => {
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

  it('/users (GET) to be empty', async () => {
    const response = await request(iTM.httpServer).get('/users');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(2);
  });

  it('/auth/signup (POST)', async () => {
    // const userData = { username: 'testuser', email: 'test@example.com' };

    const response = await request(iTM.httpServer)
      .post('/auth/signup')
      .send(regUsr)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(201);
    // logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.message).toEqual(RespConst.VERIFICATION_SENT);
    // userToken = response.body.token; // Assuming your API returns a token upon registration
  });
  it('/auth/activate (POST)', async () => {
    // const userData = { username: 'testuser', email: 'test@example.com' };

    const response = await request(iTM.httpServer)
      .post('/auth/activate')
      .send(verifyInput)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(201);
    // logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.error).toEqual('');
    expect(response.body.user.email).toEqual(regUsr.email);
    // userToken = response.body.token; // Assuming your API returns a token upon registration
  });

  it('/users (GET) to have one user', async () => {
    const response = await request(iTM.httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toEqual(3);
  });
});
