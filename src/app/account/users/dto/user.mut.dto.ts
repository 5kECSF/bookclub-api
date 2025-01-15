import { ApiHideProperty, OmitType, PartialType } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { RoleType } from '@/common/types/enums';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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
  avatar?: EmbedUpload;
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
export const UserFilter: (keyof CreateUser)[] = [
  'email',
  'firstName',
  'active',
  'lastName',
  'role',
];
