import { SetMetadata } from '@nestjs/common';
import { RoleType } from '../../common/common.types.dto';

export const ROLES_KEY = 'roles';
// this is a decorator to specify allowed Roles in a handler
export const Roles = (...roles: Array<RoleType>) => SetMetadata(ROLES_KEY, roles);
