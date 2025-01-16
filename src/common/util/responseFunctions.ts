import { HttpException } from '@nestjs/common';
import { Response } from 'express';
import { Resp } from '../constants/return.consts';
import { ColorEnums, logTrace } from '../logger';

export function ThrowRes(resp: Resp<any>, log = true) {
  if (log) {
    logTrace(resp.code, resp.message, ColorEnums.FgGreen, 3);
  }
  throw new HttpException(resp.message, resp.code);
}
export const JsonRes = (res: Response, resp: Resp<any>) => {
  logTrace(resp.code, resp.message, ColorEnums.FgGreen, 3);
  return res.status(resp.code).json(resp);
};
