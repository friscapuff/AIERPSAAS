import { SetMetadata } from '@nestjs/common';

export interface RolePermission {
  module: string;
  actions?: string[];
}

export const ROLES_KEY = 'roles';
export const Roles = (...permissions: RolePermission[]) => SetMetadata(ROLES_KEY, permissions);
