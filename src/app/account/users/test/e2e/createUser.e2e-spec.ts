// users.e2e-spec.ts

import * as request from 'supertest';
import { testUser1 } from './user.stub';
import { logTrace } from '../../../../../common/logger';
import { IntegrationTestManager } from '../../../../../../test/setup/IntegrationTestManager';

describe('UsersController (e2e)', () => {
  // let app;
  let userToken;
  const iTM = new IntegrationTestManager();
  const app = iTM.app;

  beforeAll(async () => {
    // const moduleFixture: TestingModule = await Test.createTestingModule({
    //   imports: [AppModule],
    // }).compile();
    //
    // app = moduleFixture.createNestApplication();
    // await app.init();
    await iTM.beforeAll('users');
  });

  afterAll(async () => {
    await iTM.afterAll('users');
    // await iTM.getCollection('users').drop();
  });

  it('/users (GET)', async () => {
    const response = await request(iTM.httpServer).get('/users');
    expect(response.status).toBe(200);
    expect(response.body.count).toEqual(2);
  });

  it('/users (POST)', async () => {
    // const userData = { username: 'testuser', email: 'test@example.com' };

    const response = await request(iTM.httpServer)
      .post('/users')
      .send(testUser1)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(201);
    logTrace('response', response.body);
    expect(response.status).toBe(201);
    expect(response.body.email).toEqual(testUser1.email);
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
