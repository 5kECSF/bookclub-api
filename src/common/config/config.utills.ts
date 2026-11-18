import { ColorEnums, logTrace } from '../logger';

const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

/**
 * When NODE_ENV=test (integration tests / e2e server) we must never talk to a real database.
 * Only an explicit MONGODB_URI pointing at a local host (or a host listed in
 * TEST_DB_ALLOWED_HOSTS, e.g. a testcontainers docker host) is accepted.
 */
export function assertSafeTestUri(uri: string) {
  if (process.env['NODE_ENV'] !== 'test') return;
  if (!uri) {
    throw new Error(
      'NODE_ENV=test requires an explicit MONGODB_URI (refusing to build one from .env)',
    );
  }
  if (uri.startsWith('mongodb+srv://')) {
    throw new Error('NODE_ENV=test refuses mongodb+srv URIs (remote database)');
  }
  const extra = (process.env['TEST_DB_ALLOWED_HOSTS'] || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  const allowed = [...LOCAL_DB_HOSTS, ...extra];
  const hostPart =
    uri
      .replace(/^mongodb:\/\//, '')
      .split('/')[0]
      .split('@')
      .pop() || '';
  const hosts = hostPart.split(',').map((h) => h.replace(/:\d+$/, ''));
  const bad = hosts.filter((h) => !allowed.includes(h));
  if (bad.length > 0) {
    throw new Error(`NODE_ENV=test refuses non-local database host(s): ${bad.join(', ')}`);
  }
}

export function getMongoUri() {
  // An explicit full connection string always wins (used by tests & the e2e server)
  const explicitUri = process.env['MONGODB_URI'];
  if (process.env['NODE_ENV'] === 'test') {
    assertSafeTestUri(explicitUri);
    return explicitUri;
  }
  if (explicitUri) return explicitUri;
  const MONGO_USER_NAME = tryReadEnv(ENV_NAMES.MONGO_USER_NAME);
  const MONGO_PASS = tryReadEnv(ENV_NAMES.MONGO_PASSWORD);
  const MONGO_DATABASE_NAME = tryReadEnv(ENV_NAMES.MONGO_DATABASE_NAME);
  const MONGO_HOST = tryReadEnv(ENV_NAMES.MONGO_HOSTNAME);
  const MONGO_PREFIX = tryReadEnv(ENV_NAMES.MONGO_PREFIX);
  const MONGO_PARAMS = tryReadEnv(ENV_NAMES.MONGO_PARAMS);

  const authStr = getAuthStr(MONGO_USER_NAME, MONGO_PASS);
  return `${MONGO_PREFIX}://${authStr}${MONGO_HOST}/${MONGO_DATABASE_NAME}?${MONGO_PARAMS}`;
}
function getAuthStr(username: string, password: string) {
  if (username === '' && password === '') {
    return '';
  }
  return `${username}:${password}@`;
}

// for reading enviroment variables
export function tryReadEnv(variableId: string, required = false, _defaultVal?: string | number) {
  if (variableId in process.env) {
    return process.env[variableId]!;
  }
  // if the Variable is Not Found
  if (process.env['NODE_ENV'] == 'production' || required) {
    throw new Error(
      `failed to read '${variableId}' environment variable, This IS a Production Enviroment`,
    );
  }
  if (_defaultVal) return _defaultVal;
  if (ENV_DEFAULT[variableId]) return ENV_DEFAULT[variableId];
  logTrace('failed to read', variableId, ColorEnums.BgRed, 3);
  return '';
  // throw new Error(`failed to read '${variableId}' environment variable`);
}

/** reads an optional env variable without ever throwing (even in production) */
export function readOptionalEnv(variableId: string, defaultVal = ''): string {
  const val = process.env[variableId];
  if (val === undefined || val === '') return defaultVal;
  return val;
}

export const getFireBasePrivateKey = () => {
  const pkey = tryReadEnv(ENV_NAMES.FIREBASE_PRIVATE_KEY, false, '');
  if (!pkey) return '';
  try {
    const result = pkey.replace(/'/g, '"');
    const privateKey = JSON.parse(result);
    // logTrace('json parsed value==-', privateKey, LogColors.BgCyan)
    return privateKey.privateKey;
  } catch (e) {
    logTrace('error==', e.message, ColorEnums.BgYellow);
  }
};

export function proxiedPropertiesOf<TObj>(obj?: TObj) {
  return new Proxy(
    {},
    {
      get: (_, prop) => prop,
    },
  ) as {
    [P in keyof TObj]: P;
    // [P in keyof TObj]?: P;
  };
}

// this is the type of the env variables
export type ENV_TYPES = typeof ENV_DEFAULT;
//an object with name key of EnvType & value the key as a string
export const ENV_NAMES = proxiedPropertiesOf<ENV_TYPES>();

// other implementation of proxied property
type ENVConfigNames = { [K in keyof typeof ENV_DEFAULT]: string };
// ENV Default Values

export const ENV_DEFAULT = {
  NODE_ENV: 'dev',
  PORT: '4000',
  //mongodb
  MONGO_HOSTNAME: '',
  MONGO_DATABASE_NAME: '',
  MONGO_PREFIX: 'mongodb',
  MONGO_PASSWORD: '',
  MONGO_USER_NAME: '',
  MONGO_PARAMS: '',
  MONGODB_URI: '',

  //app urls
  SERVER_URL: 'http://localhost:4000',
  CLIENT_URL: 'http://localhost:3000',
  SELF_PING_URL: 'http://localhost:9001',

  //Token secrets
  JWT_ACCESS_SECRET: 'some long secret',
  JWT_EXPIRY_TIME: 3 * 60 * 1000, //  1000ms *60sec *3min  == 3min
  JWT_REFRESH_SECRET: 'some-very-strong-jwt-refresh-secret',
  JWT_REFRESH_EXPIRY_TIME: 60 * 60 * 24 * 7 * 1000, // 7 days - 60sec * 60min *  24hrs * 7days
  JWT_REFRESH_HALF_LIFE: 60 * 60 * 24 * 3 * 1000, //3 days
  ENCRYPTION_KEY: 'someEncryption-Key',
  SESSION_SECRET: 'some-very-strong-session-secret',
  COOKIE_SECRET: 'some-very-strong-cookie-secret',
  //  email
  SENDGRID_API_KEY: '',
  EMAIL_AUTH_USER: '',
  EMAIL_USER: '',
  EMAIL_HOST: '',
  EMAIL_PASSWORD: '',
  //Firebase
  FIREBASE_PRIVATE_KEY: '',
  FIREBASE_PRIVATE_KEY_STRING: '',
  FIREBASE_CLIENT_EMAIL: 'email@gserviceaccount.com',
  FIREBASE_PROJECT_NAME: 'dd',
  FIREBASE_PROJECT_ID: 'some id',
  //Service account keys
  FIREBASE_TYPE: 'service_account',
  FIREBASE_AUTH_URI: 'https://accounts.google.com/o/oauth2/auth',
  FIREBASE_TOKEN_URI: 'https://oauth2.googleapis.com/token',
  FIREBASE_AUTH_PROVIDER_X509_CERT_URL: 'https://www.googleapis.com/oauth2/v1/certs',
  FIREBASE_PRIVATE_KEY_ID: '',
  FIREBASE_CLIENT_ID: '',
  FIREBASE_CLIENT_X509_CERT_URL: '',
  //firebase keys
  FIREBASE_STORAGE_BUCKET: '',
  FIREBASE_DATABASE_URL: '',
  //  google keys
  GMAIL_APP_PWD: '',
  EMAIL_FROM: '',
  GOOGLE_CLIENT_ID: 'some secret',
  GOOGLE_CLIENT_SECRET: '...',
  GOOGLE_GMAIL_REFRESH_TOKEN: '..',
  // when set (dev/test/e2e only) every verification code is this value instead of a random one
  VERIFICATION_CODE: '',
  // 'console' logs verification codes instead of emailing them; otherwise gmail is used when configured
  EMAIL_PROVIDER: '',
  //Storage Service: CLOUDINARY | S3_PROVIDER | LOCAL
  STORAGE_PROVIDER: '',
  // LOCAL storage: directory to write files to (default <cwd>/uploads)
  UPLOAD_DIR: '',
  //Cloudinary
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
  //S#
  S3_BUCKET: '',
  S3_ENDPOINT: '',
  S3_ACCESS_KEY: '',
  S3_SECRET_KEY: '',
  S3_REGION: 'garage',
};
