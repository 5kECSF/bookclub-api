import { ApiHideProperty, OmitType, PartialType } from '@nestjs/swagger';
import { RoleType } from '../imports.user';
import {
  IsEmail,
  IsMobilePhone,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ImageObj } from '../../file/file.dto';

export class RegisterUserInput {
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiHideProperty()
  @IsOptional()
  avatar?: ImageObj;
}

export class UpdateMeDto extends PartialType(OmitType(RegisterUserInput, ['email', 'password'])) {}

/**
 * for admins updating and creating a user
 */
export class CreateUser extends RegisterUserInput {
  @IsNotEmpty()
  role: RoleType;

  @IsBoolean()
  @IsNotEmpty()
  active: boolean;
}

export class UpdateUserWithRole extends PartialType(OmitType(CreateUser, ['email', 'password'])) {}

export class FilterUser extends PartialType(OmitType(CreateUser, ['avatar', 'password'])) {}

export class UpdateEmailInput {
  @IsEmail()
  newEmail: string;
}
