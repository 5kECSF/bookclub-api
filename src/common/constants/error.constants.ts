import { HttpCodes } from './http.codes';

export enum ErrorConstants {
  INTERNAL_ERROR = 'Internal Error',
  INVALID_INPUT = 'Your input is invalid',
  USER_EXISTS = 'USER_EXISTS',
  TOKEN_NOT_VALID = 'TOKEN_NOT_VALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_CODE = 'Code is not valid or expired',
  INVALID_CREDENTIALS = 'Invalid credentials',
  VERIFICATION_FAILED = 'verification failed please try again or use a different account',
  COULD_NOT_CREATE_USER = 'Could not create user',
}

export enum RespConst {
  OPERATION_SUCCESS = 'operation is successful',
  VERIFICATION_SENT = 'verification message Sent',
  VERIFICATION_PENDING = 'verification is pending please wait few minutes',
}

export const SystemConst = {
  VERIFICATION_CODE_EXP: 1000 * 60 * 30, // 45 minutes
  REFRESH_COOKIE: 'REFRESH_TOKEN',
};
type ErrorConstantMap = {
  [key in ErrorConstants]: number;
};
export const errCode: ErrorConstantMap = {
  //500
  [ErrorConstants.COULD_NOT_CREATE_USER]: HttpCodes.INTERNAL_SERVER_ERROR,
  [ErrorConstants.INTERNAL_ERROR]: HttpCodes.INTERNAL_SERVER_ERROR,
  //400
  [ErrorConstants.INVALID_INPUT]: HttpCodes.BAD_REQUEST,
  //409
  [ErrorConstants.USER_EXISTS]: HttpCodes.CONFLICT,
  //404
  [ErrorConstants.USER_NOT_FOUND]: HttpCodes.NOT_FOUND,
  [ErrorConstants.NOT_FOUND]: HttpCodes.NOT_FOUND,
  //401
  [ErrorConstants.UNAUTHORIZED]: HttpCodes.UNAUTHORIZED,
  [ErrorConstants.TOKEN_NOT_VALID]: HttpCodes.UNAUTHORIZED,
  [ErrorConstants.INVALID_CODE]: HttpCodes.UNAUTHORIZED,
  [ErrorConstants.INVALID_CREDENTIALS]: HttpCodes.UNAUTHORIZED,
  [ErrorConstants.VERIFICATION_FAILED]: HttpCodes.UNAUTHORIZED,
};
