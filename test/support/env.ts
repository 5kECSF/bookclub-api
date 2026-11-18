import * as os from 'os';
import * as path from 'path';
import { mkdtempSync } from 'fs';

/**
 * sets the environment used by integration tests and the e2e server.
 * MUST run before anything imports src/ (EnvVar is a singleton reading .env files; dotenv never
 * overrides variables that are already set, so NODE_ENV=test wins over the repo's NODE_ENV=remote)
 */
export function applyTestEnv(opts: {
  mongoUri: string;
  port?: number | string;
  uploadDir?: string;
}) {
  const port = String(opts.port ?? process.env.PORT ?? 9101);
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = opts.mongoUri;
  process.env.PORT = port;
  process.env.SERVER_URL = process.env.SERVER_URL || `http://localhost:${port}`;
  process.env.STORAGE_PROVIDER = 'LOCAL';
  process.env.UPLOAD_DIR =
    opts.uploadDir || mkdtempSync(path.join(os.tmpdir(), 'bookclub-uploads-'));
  process.env.VERIFICATION_CODE = '000000';
  process.env.EMAIL_PROVIDER = 'console';
  // make sure nothing real is configured
  process.env.GMAIL_APP_PWD = '';
  process.env.SELF_PING_URL = `http://localhost:${port}`;
  return process.env.UPLOAD_DIR;
}

/** adds a database name to a mongodb://host:port connection string */
export function withDbName(baseUri: string, dbName: string) {
  const [noQuery, query = ''] = baseUri.split('?');
  const params = new URLSearchParams(query);
  params.set('directConnection', 'true');
  return `${noQuery.replace(/\/+$/, '')}/${dbName}?${params.toString()}`;
}
