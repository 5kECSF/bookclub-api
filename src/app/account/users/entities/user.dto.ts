import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { RoleType } from '@/common/types/enums';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { User } from './user.entity';

export class RegisterUserInput extends PickType(User, [
  'email',
  'firstName',
  'lastName',
  'team',
  'department',
  'bio',
]) {
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiHideProperty()
  @IsOptional()
  avatar?: EmbedUpload;
}

export class UpdateMeDto extends PartialType(OmitType(RegisterUserInput, ['email', 'password'])) {
  @IsOptional()
  phoneInfo: string;
}

/**
 * for admins updating and creating a user
 */
export class CreateUserDto extends RegisterUserInput {
  @IsNotEmpty()
  role: RoleType;

  @IsOptional()
  @IsBoolean()
  active: boolean;
}

export class UpdateUserWithRole extends PartialType(
  OmitType(CreateUserDto, ['email', 'password']),
) {}

export class FilterUser extends PartialType(OmitType(CreateUserDto, ['avatar', 'password'])) {}

export class UpdateEmailInput {
  @IsEmail()
  newEmail: string;
}
export const UserFilter: (keyof User)[] = [
  'email',
  'firstName',
  'active',
  'lastName',
  'role',
  'team',
  'department',
  'accountStatus',
  'phoneInfo',
];
