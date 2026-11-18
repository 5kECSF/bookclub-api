import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { SEED_USERS, SeedUserKey, seedTaxonomy, seedUsers } from '../../support/seed';

export interface TestContext {
  app: INestApplication;
  http: () => request.SuperTest<request.Test>;
  connection: Connection;
  ids: Record<SeedUserKey, string>;
  tokens: Record<SeedUserKey, string>;
  login: (email: string, password: string) => Promise<string>;
  close: () => Promise<void>;
}

/** boots the full AppModule exactly like main.ts and seeds the default users */
export async function createTestApp(opts: { taxonomy?: boolean } = {}): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  await configureApp(app, { swagger: false });
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());
  // safety net: never run against anything but the per-file test database
  if (!connection.name.startsWith('bookclub_int_')) {
    throw new Error(`refusing to run tests against database '${connection.name}'`);
  }
  await connection.dropDatabase();
  // make sure indexes exist before transactions (collections can't be created inside them reliably)
  await Promise.all(
    Object.values(connection.models).map((m) => m.createCollection().then(() => m.syncIndexes())),
  );

  const ids = await seedUsers(app);
  if (opts.taxonomy) await seedTaxonomy(app);

  const http = () => request(app.getHttpServer());
  const login = async (email: string, password: string) => {
    const res = await http().post('/auth/login').send({ info: email, password });
    if (res.status !== 201)
      throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
    return `Bearer ${res.body.authToken.accessToken}`;
  };
  const tokens = {} as Record<SeedUserKey, string>;
  for (const key of Object.keys(SEED_USERS) as SeedUserKey[]) {
    tokens[key] = await login(SEED_USERS[key].email, SEED_USERS[key].password);
  }

  return {
    app,
    http,
    connection,
    ids,
    tokens,
    login,
    close: async () => {
      await connection.dropDatabase();
      await app.close();
    },
  };
}
