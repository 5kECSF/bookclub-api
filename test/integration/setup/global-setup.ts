import { MongoDBContainer } from '@testcontainers/mongodb';

/** starts ONE MongoDB (single node replica set -> transactions work) for the whole run */
export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  const container = await new MongoDBContainer(process.env.MONGO_TEST_IMAGE || 'mongo:7.0').start();
  (globalThis as any).__MONGO_CONTAINER__ = container;
  process.env.INTEGRATION_MONGO_BASE_URI = container.getConnectionString();
  // the testcontainers host (usually localhost) is the only remote host tests may use
  process.env.TEST_DB_ALLOWED_HOSTS = container.getHost();
}
