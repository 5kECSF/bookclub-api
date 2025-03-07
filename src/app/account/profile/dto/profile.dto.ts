import { IsString, MinLength } from 'class-validator';

export enum GENDER {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ACCOUNT_STATUS {
  REGISTERED = 'REGISTERED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
}
// User change password directly on website

export class ChangePasswordInput {
  @IsString()
  oldPassword: string;

  @MinLength(6)
  @IsString()
  newPassword: string;
}
