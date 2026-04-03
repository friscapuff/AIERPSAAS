import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: any, status?: any) {
    if (err || !user) {
      this.logger.warn(`JWT authentication failed: ${err?.message || info?.message}`);
      throw err || new Error(info?.message);
    }
    return user;
  }
}
