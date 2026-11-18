import { randomBytes } from 'crypto';
import { applyTestEnv, withDbName } from '../../support/env';

/**
 * runs before every test file (before src/ is imported): each file gets its own database
 */
process.env.LOG_TRACE = process.env.LOG_TRACE || 'off';

const base = process.env.INTEGRATION_MONGO_BASE_URI;
if (!base) throw new Error('INTEGRATION_MONGO_BASE_URI missing: run through `pnpm test:int`');
applyTestEnv({
  mongoUri: withDbName(base, `bookclub_int_${randomBytes(4).toString('hex')}`),
  port: 0,
});
