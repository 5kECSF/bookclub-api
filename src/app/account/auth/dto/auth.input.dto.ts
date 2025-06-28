// import { UserExitsValidator } from '@common/decorators/user-exists.validator'
import {
  IsBoolean,
  IsEmail,
  IsMobilePhone,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class TokenInput {
  @IsString()
  @IsOptional()
  refreshToken: string;

  @IsOptional()
  @IsBoolean()
  isCookie: boolean;
}

export class EmailInput {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class VerifyCodeInput {
  @IsString()
  @IsNotEmpty()
  phoneOrEmail: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class VerifyEmailChangeInput {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginUserInput {
  @IsString()
  @IsNotEmpty()
  info: string;

  @IsString()
  @MinLength(3)
  password: string;
}

/** user's input when verifying token to change password
 *
 */
export class ResetPasswordInput {
  @IsString()
  email: string;

  @IsString()
  code: string;

  @MinLength(6)
  @IsString()
  newPassword: string;

  @IsBoolean()
  @IsOptional()
  resetAllSessions?: string;
}

export class RequestForgotPasswordInput {
  @IsMobilePhone()
  phone: string;
}
