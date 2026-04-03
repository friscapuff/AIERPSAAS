import { SetMetadata } from '@nestjs/common';

export interface RolePermission {
  module: string;
  actions?: string[];
}

export const ROLES_KEY = 'roles';

/**
 * @Roles decorator for method-level role-based access control
 *
 * Examples:
 * @Roles({ module: 'finance', actions: ['Create', 'Read'] })
 * @Roles({ module: 'admin' })
 */
export const Roles = (...permissions: RolePermission[]) => SetMetadata(ROLES_KEY, permissions);
