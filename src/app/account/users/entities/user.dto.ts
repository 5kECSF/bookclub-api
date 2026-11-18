import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { RoleType } from '@/common/types/enums';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ACCOUNT_STATUS, GENDER } from '../../profile/dto/profile.dto';
import { toBoolTransform } from '@/common/util/object-functions';
import { Transform } from 'class-transformer';
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

  @IsOptional()
  @IsEnum(GENDER)
  gender?: GENDER;
}

/** the only fields a user may change on his own profile (PATCH /profile) */
export const UpdateMeAllowedKeys: (keyof UpdateMeDto)[] = [
  'firstName',
  'lastName',
  'team',
  'department',
  'bio',
  'phoneInfo',
  'gender',
  'avatar',
];

/**
 * for admins updating and creating a user
 */
export class CreateUserDto extends RegisterUserInput {
  @IsNotEmpty()
  @IsEnum(RoleType)
  role: RoleType;

  @IsOptional()
  @IsBoolean()
  active: boolean;
}

export class UpdateUserWithRole extends PartialType(
  OmitType(CreateUserDto, ['email', 'password']),
) {
  @IsOptional()
  @IsEnum(ACCOUNT_STATUS)
  accountStatus?: ACCOUNT_STATUS;
}

/** fields an admin can never set through PATCH /users/:id */
export const AdminUpdateForbiddenKeys = [
  '_id',
  'password',
  'hashedRefreshToken',
  'verificationCodeHash',
  'verificationCodeExpires',
  'newEmail',
];

export class FilterUser extends PartialType(
  OmitType(CreateUserDto, ['avatar', 'password', 'active']),
) {
  // query strings are strings: `?active=true` used to fail @IsBoolean
  @IsOptional()
  @Transform(toBoolTransform)
  @IsBoolean()
  active?: boolean;

  // no enum validation: the admin page sends `accountStatus=` for its "All" tab
  @IsOptional()
  accountStatus?: ACCOUNT_STATUS;
}

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
