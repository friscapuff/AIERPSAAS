import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the current user (or a specific field from it) from the JWT payload.
 * Usage:
 *   @CurrentUser() user          -> full user object from JWT
 *   @CurrentUser('id') userId    -> just the user's ID
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return data ? 'system' : { id: 'system' };
    return data ? user[data] : user;
  },
);
