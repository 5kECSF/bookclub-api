import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IncomingMessage } from 'http';
//crypto
import { CustomJwtService, RoleType, UserFromToken } from './guards.dependencies';

import { ROLES_KEY } from './roles.decorators';

// this Guard is for non Graphql endpoints - this  verifies the `jwt Token & the Roles`  This is Enough for our app
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly jwtService: CustomJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest<IncomingMessage & { user?: Record<string, unknown> }>(context); // you could use FastifyRequest here too
    try {
      // ==============================     Authentication  ==============
      const token = this.getToken(request);

      const user: UserFromToken = (await this.jwtService.verifyAccessToken(token)) as UserFromToken;
      if (!user) return false;
      request.user = user as any;

      // ========================================= Authorization =======================

      //                      ********  Getting the roles from the handler
      //Roles defined by the top class
      const classRole = this.reflector.get<RoleType[]>(ROLES_KEY, context.getClass());
      //roles defined by each handler function/resolver
      const handlerRole = this.reflector.get<RoleType[]>(ROLES_KEY, context.getHandler());

      let allowedRoles: RoleType[] = [];

      if (classRole) {
        allowedRoles = classRole;
      }
      if (handlerRole) {
        allowedRoles = allowedRoles.concat(handlerRole);
      }

      // If no roles are found it can continue.
      if (allowedRoles.length < 1) return true;
      // Make sure always pass for 'ADMIN'
      allowedRoles.push(RoleType.ADMIN);

      // User must have role & the value of role must match with @RoleGuard('value_role')
      return user.role && allowedRoles.includes(user.role);
    } catch (e) {
      // return false or throw a specific error if desired
      return false;
    }
  }

  protected getRequest<T>(context: ExecutionContext): T {
    return context.switchToHttp().getRequest();
  }

  protected getToken(request: { headers: Record<string, string | string[]> }): string {
    const authorization = request.headers['authorization'];
    if (!authorization || Array.isArray(authorization)) {
      throw new Error('Invalid Authorization Header');
    }

    return authorization;
  }
}
