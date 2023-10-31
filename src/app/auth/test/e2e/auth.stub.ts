import { VerifyCodeInput } from '../../dto/auth.input.dto';
import { RegisterUserInput } from '../../../users';

export const regUsr: RegisterUserInput = {
  email: 'testUsr1@gmail.com',
  firstName: 'tsf',
  lastName: 'tsl',
  password: '123qwe',
};

export const verifyInput: VerifyCodeInput = {
  phoneOrEmail: regUsr.email,
  code: '0000',
};
