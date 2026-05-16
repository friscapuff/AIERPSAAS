import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, Tenant, Role, TenantStatus, SubscriptionPlan } from '@libs/database';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto';
import Redis from 'ioredis';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private redis: Redis;
  private readonly BCRYPT_ROUNDS = 12;
  private readonly TOKEN_BLACKLIST_PREFIX = 'token_blacklist:';

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        db: this.configService.get<number>('REDIS_DB', 0),
      });
    } catch (error) {
      this.logger.warn('Redis connection failed, running without token blacklist', error);
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingTenant = await queryRunner.manager.findOne(Tenant, {
        where: { subdomain: registerDto.subdomain.toLowerCase() },
      });

      if (existingTenant) {
        throw new ConflictException('Subdomain already in use');
      }

      const tenant = queryRunner.manager.create(Tenant, {
        name: registerDto.tenantName,
        subdomain: registerDto.subdomain.toLowerCase(),
        subscription_plan: SubscriptionPlan.FREE,
        status: TenantStatus.ACTIVE,
        max_users: 5,
        settings: {
          currency: 'USD',
          timezone: 'UTC',
          fiscalYearStart: '01-01',
          decimalPlaces: 2,
          enableApprovalWorkflow: false,
          enableAuditLog: true,
        },
      });

      const savedTenant = await queryRunner.manager.save(tenant);
      this.logger.log(`Tenant created: ${savedTenant.id}`);

      const adminRole = queryRunner.manager.create(Role, {
        tenant_id: savedTenant.id,
        name: 'Admin',
        description: 'Administrator with full access',
        is_system: true,
        permissions: {
          finance: { create: true, read: true, update: true, delete: true, post: true, void: true },
          inventory: { create: true, read: true, update: true, delete: true, post: true, void: true },
          hr: { create: true, read: true, update: true, delete: true, post: true, void: true },
          sales: { create: true, read: true, update: true, delete: true, post: true, void: true },
          purchase: { create: true, read: true, update: true, delete: true, post: true, void: true },
          admin: { create: true, read: true, update: true, delete: true },
        },
      });

      const savedAdminRole = await queryRunner.manager.save(adminRole);
      this.logger.log(`Admin role created: ${savedAdminRole.id}`);

      const passwordHash = await this.hashPassword(registerDto.password);

      const user = queryRunner.manager.create(User, {
        tenant_id: savedTenant.id,
        email: registerDto.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: registerDto.firstName,
        last_name: registerDto.lastName,
        role_id: savedAdminRole.id,
        is_active: true,
        mfa_enabled: false,
      });

      const savedUser = await queryRunner.manager.save(user);
      this.logger.log(`Admin user created: ${savedUser.id}`);

      const tokens = await this.generateTokens(savedUser, savedTenant, [savedAdminRole]);

      await queryRunner.commitTransaction();

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          isActive: savedUser.is_active,
        },
        tenant: {
          id: savedTenant.id,
          name: savedTenant.name,
          subdomain: savedTenant.subdomain,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Registration failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // ── Resolve tenant by ID, subdomain, or email lookup ──────────────
    let tenant: Tenant | null = null;

    if (loginDto.tenantId) {
      // Direct tenant ID lookup
      tenant = await this.tenantsRepository.findOne({
        where: { id: loginDto.tenantId },
      });
    } else if (loginDto.tenantSubdomain) {
      // Subdomain lookup (what the frontend sends)
      const subdomain = loginDto.tenantSubdomain.toLowerCase().trim();
      tenant = await this.tenantsRepository.findOne({
        where: [
          { subdomain },
          { slug: subdomain },
        ],
      });
    } else {
      // No tenant identifier — try to find user by email across all tenants
      const user = await this.usersRepository.findOne({
        where: { email: loginDto.email.toLowerCase() },
      });
      if (user) {
        tenant = await this.tenantsRepository.findOne({
          where: { id: user.tenant_id },
        });
      }
    }

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found or is inactive');
    }

    // Check tenant is active
    const activeStatuses = [TenantStatus.ACTIVE, 'trial' as TenantStatus];
    if (!activeStatuses.includes(tenant.status)) {
      throw new UnauthorizedException('Tenant not found or is inactive');
    }

    const user = await this.usersRepository.findOne({
      where: {
        email: loginDto.email.toLowerCase(),
        tenant_id: tenant.id,
      },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.comparePassword(loginDto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    const roles = user.role ? [user.role] : [];

    const tokens = await this.generateTokens(user, tenant, roles);

    user.last_login = new Date();
    await this.usersRepository.save(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain || tenant.slug || '',
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    try {
      const isBlacklisted = await this.isTokenBlacklisted(refreshTokenDto.refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-key'),
      });

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, tenant_id: payload.tenant_id },
        relations: ['role'],
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or is inactive');
      }

      const tenant = await this.tenantsRepository.findOne({
        where: { id: payload.tenant_id },
      });

      if (!tenant) {
        throw new UnauthorizedException('Tenant not found or is inactive');
      }

      const roles = user.role ? [user.role] : [];

      const tokens = await this.generateTokens(user, tenant, roles);

      if (this.redis) {
        try {
          const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            await this.redis.setex(
              `${this.TOKEN_BLACKLIST_PREFIX}${refreshTokenDto.refreshToken}`,
              expiresIn,
              '1',
            );
          }
        } catch (redisError) {
          this.logger.warn('Failed to blacklist refresh token in Redis', redisError);
        }
      }

      return tokens;
    } catch (error) {
      this.logger.error(`Token refresh failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, token: string): Promise<{ message: string }> {
    try {
      if (this.redis) {
        try {
          const decoded = this.jwtService.decode(token) as any;
          if (decoded && decoded.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
              await this.redis.setex(
                `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
                expiresIn,
                '1',
              );
            }
          }
        } catch (redisError) {
          this.logger.warn('Failed to blacklist token in Redis', redisError);
        }
      }

      this.logger.log(`User ${userId} logged out successfully`);
      return { message: 'Logout successful' };
    } catch (error) {
      this.logger.error(`Logout failed: ${(error as Error).message}`);
      throw new InternalServerErrorException('Logout failed');
    }
  }

  async changePassword(
    userId: string,
    tenantId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenant_id: tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await this.comparePassword(
      changePasswordDto.currentPassword,
      user.password_hash,
    );

    if (!passwordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await this.hashPassword(changePasswordDto.newPassword);

    user.password_hash = newPasswordHash;
    await this.usersRepository.save(user);

    this.logger.log(`Password changed for user ${userId}`);
    return { message: 'Password changed successfully' };
  }

  async validateUser(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, tenant_id: tenantId },
    });

    return user ? user.is_active : false;
  }

  async generateTokens(user: User, tenant: Tenant, roles: Role[]): Promise<AuthTokens> {
    const permissions = this.buildPermissionsFromRoles(roles);
    const roleNames = roles.map((r) => r.name);

    const accessPayload = {
      sub: user.id,
      email: user.email,
      tenant_id: tenant.id,
      roles: roleNames,
      permissions,
      iat: Math.floor(Date.now() / 1000),
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      tenant_id: tenant.id,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-key'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }

  private buildPermissionsFromRoles(roles: Role[]): Record<string, any> {
    const permissions: Record<string, any> = {};

    for (const role of roles) {
      if (role.permissions) {
        Object.keys(role.permissions).forEach((module) => {
          if (!permissions[module]) {
            permissions[module] = role.permissions[module];
          } else {
            const existing = permissions[module];
            const rolePerms = role.permissions[module];
            permissions[module] = {
              ...existing,
              ...rolePerms,
              create: existing.create || rolePerms.create,
              read: existing.read || rolePerms.read,
              update: existing.update || rolePerms.update,
              delete: existing.delete || rolePerms.delete,
              post: existing.post || rolePerms.post,
              void: existing.void || rolePerms.void,
            };
          }
        });
      }
    }

    return permissions;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  private async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const result = await this.redis.get(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
      return result === '1';
    } catch (error) {
      this.logger.warn('Failed to check token blacklist in Redis', error);
      return false;
    }
  }
}
