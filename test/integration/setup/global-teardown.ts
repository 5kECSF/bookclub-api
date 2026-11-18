export default async function globalTeardown() {
  const container = (globalThis as any).__MONGO_CONTAINER__;
  if (container) await container.stop();
}
