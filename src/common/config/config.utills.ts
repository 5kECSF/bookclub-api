import { ColorEnums, logTrace } from '../logger';

// === for reading mongodb urls
export function getMongoUri(uri: string, required = false, isRemote = 'false', defaultVal = '') {
  const MONGO_USER_NAME = tryReadEnv(ENV_NAMES.MONGO_USER_NAME);
  const MONGO_PASS = tryReadEnv(ENV_NAMES.MONGO_PASSWORD);
  const MONGO_DATABASE_NAME = tryReadEnv(ENV_NAMES.MONGO_DATABASE_NAME);
  const MONGO_HOST = tryReadEnv(ENV_NAMES.MONGO_HOSTNAME);

  const IS_MONGO_REMOTE = tryReadEnv(ENV_NAMES.IS_MONGO_REMOTE);
  const MONGO_REMOTE_STRING = `mongodb+srv://${MONGO_USER_NAME}:${MONGO_PASS}@${MONGO_HOST}/${MONGO_DATABASE_NAME}?retryWrites=true&w=majority`;

  // console.log(ENV_NAMES.IS_MONGO_REMOTE, isRemote, MONGO_USER_NAME, isRemote);
  // console.log(MONGO_REMOTE_STRING);
  if (IS_MONGO_REMOTE == 'true') return MONGO_REMOTE_STRING;
  //local test and dev databases
  if (process.env['NODE_ENV'] == 'test') {
    return tryReadEnv(ENV_NAMES.MONGO_TEST_DATABASE, required);
  }
  logTrace('getting mongo Uri', uri);
  logTrace('getting mongo Uri', ENV_DEFAULT[uri]);

  return tryReadEnv(uri, required, defaultVal);
}

// for reading enviroment variables
export function tryReadEnv(variableId: string, required = false, _defaultVal?: string) {
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
  logTrace('failed to read', variableId, ColorEnums.BgRed);
  throw new Error(`failed to read '${variableId}' environment variable`);
}

export const getFireBasePrivateKey = () => {
  const pkey = tryReadEnv(ENV_NAMES.FIREBASE_PRIVATE_KEY, false, '');
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
  MONGO_USER_NAME: '',
  MONGO_PASSWORD: '',
  MONGO_HOSTNAME: '',
  MONGO_DATABASE_NAME: '',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/book-club-dev',
  MONGO_TEST_DATABASE: 'mongodb://127.0.0.1:27017/book-club-e2e-test-db',
  IS_MONGO_REMOTE: 'false',
  //app urls
  SERVER_URL: 'http://localhost:4000',
  CLIENT_URL: 'http://localhost:3000',
  //Token secrets
  JWT_ACCESS_SECRET: 'some long secret',
  JWT_EXPIRY_TIME: '30m', //  1000ms *60sec *3min  == 3min
  JWT_REFRESH_SECRET: 'some-very-strong-jwt-refresh-secret',
  JWT_REFRESH_EXPIRY_TIME: '7d', // 7 days - 60sec * 60min *  24hrs * 7days
  JWT_REFRESH_HALF_LIFE: '3d', //3 days
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
  FIREBASE_PRIVATE_KEY_STRING: 'd',
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
};
