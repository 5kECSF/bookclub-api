import { createParamDecorator } from '@nestjs/common';
// returns the current authenticated user from the guard
export const CurUser = createParamDecorator((data, req) => {
  return req.user;
});
