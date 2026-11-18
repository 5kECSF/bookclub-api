import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IncomingMessage } from 'http';
//crypto

import { UserFromToken } from '@/common/types/common.types.dto';
import { RoleType } from '@/common/types/enums';
import { CustomJwtService } from '../crypto/jwt.service';
import { ROLES_KEY } from './roles.decorators';

// this Guard is for non Graphql endpoints - this  verifies the `jwt Token & the Roles`  This is Enough for our app
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly jwtService: CustomJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest<IncomingMessage & { user?: Record<string, unknown> }>(context); // you could use FastifyRequest here too
    // ==============================     Authentication (401)  ==============
    let user: UserFromToken;
    try {
      const token = this.getToken(request);
      user = (await this.jwtService.verifyAccessToken(token)) as UserFromToken;
    } catch (e) {
      throw new UnauthorizedException(e?.message || 'Invalid or expired token');
    }
    if (!user || !user._id) throw new UnauthorizedException('Invalid token payload');
    request.user = user as any;

    // ==============================     Authorization (403)  ==============
    try {
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
      return Boolean(user.role && allowedRoles.includes(user.role));
    } catch (e) {
      // returning false makes nest respond with 403
      return false;
    }
  }

  protected getRequest<T>(context: ExecutionContext): T {
    return context.switchToHttp().getRequest();
  }

  protected getToken(request: { headers: Record<string, string | string[]> }): string {
    const authorization = request.headers['authorization'];
    if (!authorization || Array.isArray(authorization)) {
      throw new Error('Missing or invalid Authorization header');
    }

    return authorization;
  }
}
