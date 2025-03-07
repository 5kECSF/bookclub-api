import { RoleType } from '@/common/types/enums';
import { LoginUserInput } from '../../../auth/dto/auth.input.dto';
import { CreateUserDto } from '../../entities/user.dto';

export const defaultAdmin: CreateUserDto = {
  active: true,
  role: RoleType.ADMIN,

  email: 'testDefaultAdmin1@gmail.com',
  firstName: 'tafn',
  lastName: 'taln',
  password: '123qwe',
};

export const defaultUser1: CreateUserDto = {
  active: true,
  role: RoleType.USER,

  email: 'testDefaultUser1@gmail.com',
  firstName: 'tufn',
  lastName: 'tuln',
  password: '123qwe',
};
export const adminLogin: LoginUserInput = {
  info: defaultAdmin.email,
  password: defaultAdmin.password,
};
export const userLogin: LoginUserInput = {
  info: defaultUser1.email,
  password: defaultUser1.password,
};

export const testUser1: CreateUserDto = {
  active: true,
  role: RoleType.USER,

  email: 'testUser1@gmail.com',
  firstName: 'test fn',
  lastName: 'test ln',
  password: '123qwe',
};

export const testAdmin1: CreateUserDto = {
  active: true,
  role: RoleType.ADMIN,

  email: 'testDefaultAdmin1@gmail.com',
  firstName: 'test fn ',
  lastName: 'test ln',
  password: '123qwe',
};
