export interface Resp<T> {
  ok: boolean;
  body: T;
  error: Error;
  errMessage?: string;
  errName?: string;
  code?: number;
  message: string;
}

export function FAIL(errMessage: string, code = 400, e: Error = null): Resp<any> {
  // logTrace('Error Response', errMessage, ColorEnums.BgMagenta, 3);

  return {
    ok: false,
    body: null,
    error: e,
    errMessage,
    message: errMessage,
    code,
  };
}

export function Succeed<T>(val: T, msg = 'success'): Resp<T> {
  return {
    ok: true,
    body: val,
    error: null,
    message: msg,
    code: 200,
  };
}
