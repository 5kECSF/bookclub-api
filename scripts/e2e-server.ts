/**
 * E2E API server for the frontend's end-to-end tests:
 *   pnpm start:e2e            (PORT env, default 9101)
 *
 * - starts a throw-away MongoDB testcontainer (single node replica set -> transactions work)
 * - boots the compiled app (dist/, built by `nest build` in the npm script) exactly like main.ts
 * - NODE_ENV=test, STORAGE_PROVIDER=LOCAL (temp dir), VERIFICATION_CODE=000000, EMAIL_PROVIDER=console
 * - seeds admin/reader/pending users, 2 categories and 3 genres
 * It can never touch the .env/.env.remote databases: NODE_ENV=test only accepts the explicit
 * MONGODB_URI of the container (see assertSafeTestUri in src/common/config/config.utills.ts).
 */
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import * as path from 'path';
import { applyTestEnv, withDbName } from '../test/support/env';

async function main() {
  const port = Number(process.env.PORT || 9101);
  process.env.NODE_ENV = 'test';

  console.log('[e2e] starting MongoDB container...');
  const container: StartedMongoDBContainer = await new MongoDBContainer(
    process.env.MONGO_TEST_IMAGE || 'mongo:7.0',
  ).start();
  process.env.TEST_DB_ALLOWED_HOSTS = container.getHost();
  const mongoUri = withDbName(container.getConnectionString(), 'bookclub_e2e');
  const uploadDir = applyTestEnv({ mongoUri, port });

  let app: any;
  let stopping = false;
  const stop = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    console.log('\n[e2e] shutting down...');
    try {
      if (app) await app.close();
    } catch (e) {
      console.error('[e2e] error closing app', e?.message);
    }
    try {
      await container.stop();
      console.log('[e2e] MongoDB container stopped');
    } catch (e) {
      console.error('[e2e] error stopping container', e?.message);
    }
    process.exit(code);
  };
  process.on('SIGINT', () => stop(0));
  process.on('SIGTERM', () => stop(0));

  try {
    // env is set: only now load the compiled app (EnvVar reads process.env on first use)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bootstrap } = require(path.join(__dirname, '..', 'dist', 'main'));
    app = await bootstrap(port);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { seedUsers, seedTaxonomy, SEED_USERS } = require('../test/support/seed');
    await seedUsers(app);
    const taxonomy = await seedTaxonomy(app);

    console.log('');
    console.log('[e2e] seeded users:');
    for (const u of Object.values<any>(SEED_USERS)) {
      console.log(
        `[e2e]   ${u.email.padEnd(24)} ${u.password.padEnd(14)} ${u.role} ${u.accountStatus}`,
      );
    }
    console.log(
      `[e2e] categories: ${taxonomy.categories.join(', ')}; genres: ${taxonomy.genres.join(', ')}`,
    );
    console.log(`[e2e] verification code: ${process.env.VERIFICATION_CODE}, uploads: ${uploadDir}`);
    console.log(`[e2e] MongoDB: ${mongoUri}`);
    console.log(`E2E API ready on http://localhost:${port}`);
  } catch (e) {
    console.error('[e2e] failed to start', e);
    await stop(1);
  }
}

main();
