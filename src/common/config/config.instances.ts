import {
  ENV_DEFAULT,
  ENV_NAMES,
  ENV_TYPES,
  getFireBasePrivateKey,
  getMongoUri,
  tryReadEnv,
} from './config.utills';
import { ColorEnums, logTrace } from '../logger';
import * as dotenv from 'dotenv';
// import fs from 'fs';

export const LOAD_ENVS = (req = false): ENV_TYPES => {
  return {
    ...ENV_DEFAULT,
    NODE_ENV: tryReadEnv('NODE_ENV'),
    PORT: tryReadEnv(ENV_NAMES.PORT, req),
    //Database
    MONGODB_URI: getMongoUri(ENV_NAMES.MONGODB_URI, req, tryReadEnv(ENV_NAMES.IS_MONGO_REMOTE)),
    //Jwt Related
    JWT_ACCESS_SECRET: tryReadEnv(ENV_NAMES.JWT_ACCESS_SECRET, req),
    JWT_REFRESH_SECRET: tryReadEnv(ENV_NAMES.JWT_REFRESH_SECRET, req),
    JWT_EXPIRY_TIME: tryReadEnv(ENV_NAMES.JWT_EXPIRY_TIME, req, `${ENV_DEFAULT.JWT_EXPIRY_TIME}`),
    JWT_REFRESH_EXPIRY_TIME: tryReadEnv(
      ENV_NAMES.JWT_REFRESH_EXPIRY_TIME,
      req,
      `${ENV_DEFAULT.JWT_REFRESH_EXPIRY_TIME}`,
    ),
    ENCRYPTION_KEY: tryReadEnv(ENV_NAMES.ENCRYPTION_KEY, req),
    //  Firebase envs
    FIREBASE_PRIVATE_KEY: getFireBasePrivateKey(),
    FIREBASE_PRIVATE_KEY_STRING: tryReadEnv(ENV_NAMES.FIREBASE_PRIVATE_KEY_STRING, req),
    FIREBASE_CLIENT_EMAIL: tryReadEnv(ENV_NAMES.FIREBASE_CLIENT_EMAIL, req),
    FIREBASE_PROJECT_ID: tryReadEnv(ENV_NAMES.FIREBASE_PROJECT_ID, req),
    FIREBASE_PROJECT_NAME: tryReadEnv(ENV_NAMES.FIREBASE_PROJECT_NAME, req),
    //   google console envs
    GMAIL_APP_PWD: tryReadEnv(ENV_NAMES.GMAIL_APP_PWD, req),
    EMAIL_FROM: tryReadEnv(ENV_NAMES.EMAIL_FROM, req),
    // GOOGLE_CLIENT_ID: tryReadEnv(ENV_NAMES.GOOGLE_CLIENT_ID, req),
    // GOOGLE_CLIENT_SECRET: tryReadEnv(ENV_NAMES.GOOGLE_CLIENT_SECRET, req),
    // GOOGLE_GMAIL_REFRESH_TOKEN: tryReadEnv(ENV_NAMES.GOOGLE_GMAIL_REFRESH_TOKEN, req),
  };
};

export class EnvVar {
  private static _instance: EnvVar;
  envVariables: ENV_TYPES;

  private constructor() {
    // we must have a .env upload to tell us the Enviroment at first, it first read the .env upload then it loads the other env files
    dotenv.config({ path: `.env` });
    let mode = tryReadEnv('NODE_ENV', false, '');

    // MODE IS PRODUCTION
    if (mode === 'prod') {
      dotenv.config({ path: `.env.${mode}` });
      this.envVariables = LOAD_ENVS(true);
    } else {
      // MODE COULD BE TEST || dev
      logTrace(`NODE_ENV is --| == ${mode ? mode : 'NO Node_ENV'} ==`, '', ColorEnums.BgMagenta);
      if (!mode) mode = 'dev';
      dotenv.config({ path: `.env.${mode}` });
      this.envVariables = LOAD_ENVS(false);
    }
  }

  static get getInstance() {
    if (!EnvVar._instance) {
      EnvVar._instance = new EnvVar();
    }
    return this._instance.envVariables;
    // Do you need arguments? Make it a regular static method instead.
    // return this._instance || (this._instance = new this());
  }

  // loadEnv(req: boolean) {
  //   try {
  //     this.envVariables = LoadEnvConfig(req);
  //   } catch (e) {
  //     logTrace('z error is', e.message, ColorEnums.BgRed);
  //   }
  // }
}

// export const EnvConfigs = EnvVar.getInstance;
