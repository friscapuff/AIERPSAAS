import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() parameter decorator
 * Extracts the authenticated user from the request object
 *
 * Usage:
 * getProfile(@CurrentUser() user: any) { ... }
 * getUsername(@CurrentUser('username') username: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      return user && user[data];
    }

    return user;
  },
);
