import { HttpCodes } from './http.codes';

export enum ResponseConsts {
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
  OPERATION_SUCCESS = 'operation is successful',
  VERIFICATION_SENT = 'verification message Sent',
  VERIFICATION_PENDING = 'verification is pending please wait few minutes',
}

export enum RespConst {
  OPERATION_SUCCESS = 'operation is successful',
  VERIFICATION_SENT = 'verification message Sent',
  VERIFICATION_PENDING = 'verification is pending please wait few minutes',
}

type ErrorConstantMap = {
  [key in ResponseConsts]: number;
};
export const errCode: ErrorConstantMap = {
  //500
  [ResponseConsts.COULD_NOT_CREATE_USER]: HttpCodes.INTERNAL_SERVER_ERROR,
  [ResponseConsts.INTERNAL_ERROR]: HttpCodes.INTERNAL_SERVER_ERROR,
  //400
  [ResponseConsts.INVALID_INPUT]: HttpCodes.BAD_REQUEST,
  //409
  [ResponseConsts.USER_EXISTS]: HttpCodes.CONFLICT,
  //404
  [ResponseConsts.USER_NOT_FOUND]: HttpCodes.NOT_FOUND,
  [ResponseConsts.NOT_FOUND]: HttpCodes.NOT_FOUND,
  //401
  [ResponseConsts.UNAUTHORIZED]: HttpCodes.UNAUTHORIZED,
  [ResponseConsts.TOKEN_NOT_VALID]: HttpCodes.UNAUTHORIZED,
  [ResponseConsts.INVALID_CODE]: HttpCodes.UNAUTHORIZED,
  [ResponseConsts.INVALID_CREDENTIALS]: HttpCodes.UNAUTHORIZED,
  [ResponseConsts.VERIFICATION_FAILED]: HttpCodes.UNAUTHORIZED,
  //201
  [ResponseConsts.OPERATION_SUCCESS]: HttpCodes.CREATED,
  [ResponseConsts.VERIFICATION_SENT]: HttpCodes.CREATED,
  [ResponseConsts.VERIFICATION_PENDING]: HttpCodes.CREATED,
};
