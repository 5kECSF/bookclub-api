import { RoleType } from '@/common/types/enums';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// this is a decorator to specify allowed Roles in a handler
export const Roles = (...roles: Array<RoleType>) => SetMetadata(ROLES_KEY, roles);
