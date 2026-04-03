import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

export interface RolePermission {
  module: string;
  actions: string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolePermission[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context is required');
    }

    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenException('User has no roles assigned');
    }

    const hasRequiredRole = this.matchRoles(user.roles, requiredRoles);

    if (!hasRequiredRole) {
      this.logger.warn(`Access denied for user ${user.id}`);
      throw new ForbiddenException('Insufficient permissions to access this resource');
    }

    return true;
  }

  private matchRoles(userRoles: string[], requiredRoles: RolePermission[]): boolean {
    return requiredRoles.some((requiredRole) => {
      const hasModuleRole = userRoles.some(
        (role) =>
          role === requiredRole.module ||
          role === `${requiredRole.module}:*` ||
          role === 'admin' ||
          role === 'super_admin',
      );

      if (!hasModuleRole) {
        return false;
      }

      if (requiredRole.actions && requiredRole.actions.length > 0) {
        return requiredRole.actions.every(
          (action) =>
            userRoles.some(
              (role) =>
                role === `${requiredRole.module}:${action}` ||
                role === `${requiredRole.module}:*` ||
                role === 'admin' ||
                role === 'super_admin',
            ),
        );
      }

      return true;
    });
  }
}
