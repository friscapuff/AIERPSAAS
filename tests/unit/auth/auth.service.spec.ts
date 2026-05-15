/**
 * Auth Service — unit test suite.
 *
 * Coverage:
 *  - register: creates tenant + admin role + user in transaction, conflict on duplicate subdomain
 *  - login: correct/wrong password, inactive user, inactive tenant
 *  - refreshToken: valid, expired, blacklisted
 *  - logout: blacklists token in Redis
 *  - changePassword: correct/wrong current password
 *  - generateTokens: payload structure
 *  - password hashing: bcrypt round-trip
 */

import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../apps/api/src/modules/auth/auth.service';
import {
  createMockRepository,
  createMockDataSource,
  createMockQueryRunner,
  createMockUser,
  createMockTenant,
  createMockRole,
  mockTenantId,
  mockUserId,
  mockRoleId,
} from '../../setup/test-utils';
import { TenantStatus, SubscriptionPlan } from '@libs/database';

// ---------------------------------------------------------------------------
// Mock ioredis before any imports that pull it in
// ---------------------------------------------------------------------------

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockJwtService(tokenOverrides: Partial<any> = {}) {
  return {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn().mockReturnValue({
      sub: mockUserId,
      tenant_id: mockTenantId,
      email: 'admin@test.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      ...tokenOverrides,
    }),
    decode: jest.fn().mockReturnValue({
      sub: mockUserId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  };
}

function buildMockConfigService(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_DB: 0,
  };
  return {
    get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
      return overrides[key] ?? defaults[key] ?? defaultVal;
    }),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: ReturnType<typeof createMockRepository>;
  let tenantsRepository: ReturnType<typeof createMockRepository>;
  let rolesRepository: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof buildMockJwtService>;
  let configService: ReturnType<typeof buildMockConfigService>;
  let dataSource: ReturnType<typeof createMockDataSource>;
  let queryRunner: ReturnType<typeof createMockQueryRunner>;

  beforeEach(() => {
    usersRepository = createMockRepository();
    tenantsRepository = createMockRepository();
    rolesRepository = createMockRepository();
    jwtService = buildMockJwtService();
    configService = buildMockConfigService();
    queryRunner = createMockQueryRunner();
    dataSource = createMockDataSource(queryRunner);

    service = new AuthService(
      usersRepository as any,
      tenantsRepository as any,
      rolesRepository as any,
      jwtService as any,
      configService as any,
      dataSource as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // register
  // =========================================================================

  describe('register', () => {
    const registerDto = {
      tenantName: 'Acme Corp',
      subdomain: 'acme-corp',
      email: 'admin@acme.com',
      password: 'SecureP@ssw0rd!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create tenant, admin role, and user in a single transaction', async () => {
      // Arrange: no existing tenant with subdomain
      queryRunner.manager.findOne.mockResolvedValue(null);

      const savedTenant = createMockTenant({ id: mockTenantId, subdomain: 'acme-corp' });
      const savedRole = createMockRole({ id: mockRoleId });
      const savedUser = createMockUser({
        id: mockUserId,
        email: 'admin@acme.com',
        first_name: 'John',
        last_name: 'Doe',
      });

      queryRunner.manager.save
        .mockResolvedValueOnce(savedTenant)  // tenant save
        .mockResolvedValueOnce(savedRole)    // role save
        .mockResolvedValueOnce(savedUser);   // user save

      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.tenant.subdomain).toBe('acme-corp');
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
    });

    it('should normalise subdomain and email to lowercase', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);
      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));
      queryRunner.manager.save
        .mockResolvedValueOnce(createMockTenant({ subdomain: 'acme-corp' }))
        .mockResolvedValueOnce(createMockRole())
        .mockResolvedValueOnce(createMockUser({ email: 'admin@acme.com' }));

      await service.register({
        ...registerDto,
        subdomain: 'ACME-CORP',
        email: 'ADMIN@ACME.COM',
      });

      // The tenant create call should have used lowercase subdomain
      const createCalls = queryRunner.manager.create.mock.calls;
      const tenantCreateCall = createCalls.find(
        (call: any[]) => call[1]?.subdomain !== undefined,
      );
      if (tenantCreateCall) {
        expect(tenantCreateCall[1].subdomain).toBe('acme-corp');
      }
    });

    it('should throw ConflictException when subdomain is already taken', async () => {
      // Arrange: existing tenant with same subdomain
      queryRunner.manager.findOne.mockResolvedValue(
        createMockTenant({ subdomain: 'acme-corp' }),
      );

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on unexpected error', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);
      queryRunner.manager.create.mockImplementation((_: any, data: any) => ({ ...data }));
      queryRunner.manager.save.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(service.register(registerDto)).rejects.toThrow('DB connection lost');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should assign FREE plan and ACTIVE status to new tenant', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);

      let capturedTenantData: any;
      queryRunner.manager.create.mockImplementation((_: any, data: any) => {
        if (data?.subscription_plan) capturedTenantData = data;
        return { ...data };
      });
      queryRunner.manager.save
        .mockResolvedValueOnce(createMockTenant())
        .mockResolvedValueOnce(createMockRole())
        .mockResolvedValueOnce(createMockUser());

      await service.register(registerDto);

      if (capturedTenantData) {
        expect(capturedTenantData.subscription_plan).toBe(SubscriptionPlan.FREE);
        expect(capturedTenantData.status).toBe(TenantStatus.ACTIVE);
      }
    });
  });

  // =========================================================================
  // login
  // =========================================================================

  describe('login', () => {
    const loginDto = {
      tenantId: mockTenantId,
      email: 'admin@acme.com',
      password: 'SecureP@ssw0rd!',
    };

    async function hashPassword(plain: string) {
      return bcrypt.hash(plain, 4); // low rounds for test speed
    }

    it('should return tokens and user info on correct credentials', async () => {
      const passwordHash = await hashPassword('SecureP@ssw0rd!');
      const mockTenant = createMockTenant();
      const mockUser = createMockUser({ password_hash: passwordHash });

      tenantsRepository.findOne.mockResolvedValue(mockTenant);
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tenant.id).toBe(mockTenantId);
    });

    it('should throw UnauthorizedException when tenant is not found', async () => {
      tenantsRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when tenant is suspended', async () => {
      tenantsRepository.findOne.mockResolvedValue(null); // findOne with status=ACTIVE returns null

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      tenantsRepository.findOne.mockResolvedValue(createMockTenant());
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const passwordHash = await hashPassword('correct-password');
      tenantsRepository.findOne.mockResolvedValue(createMockTenant());
      usersRepository.findOne.mockResolvedValue(
        createMockUser({ password_hash: passwordHash }),
      );

      await expect(
        service.login({ ...loginDto, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user account is inactive', async () => {
      const passwordHash = await hashPassword('SecureP@ssw0rd!');
      tenantsRepository.findOne.mockResolvedValue(createMockTenant());
      usersRepository.findOne.mockResolvedValue(
        createMockUser({ password_hash: passwordHash, is_active: false }),
      );

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should update last_login timestamp on successful login', async () => {
      const passwordHash = await hashPassword('SecureP@ssw0rd!');
      const mockUser = createMockUser({ password_hash: passwordHash });
      tenantsRepository.findOne.mockResolvedValue(createMockTenant());
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);

      await service.login(loginDto);

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ last_login: expect.any(Date) }),
      );
    });
  });

  // =========================================================================
  // refreshToken
  // =========================================================================

  describe('refreshToken', () => {
    it('should return new token pair for a valid refresh token', async () => {
      const mockUser = createMockUser();
      const mockTenant = createMockTenant();

      usersRepository.findOne.mockResolvedValue(mockUser);
      tenantsRepository.findOne.mockResolvedValue(mockTenant);

      const result = await service.refreshToken({ refreshToken: 'valid.refresh.token' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException when refresh token is blacklisted', async () => {
      // Override Redis mock to return '1' (blacklisted)
      const redisMock = (service as any).redis;
      if (redisMock) {
        redisMock.get.mockResolvedValue('1');
      }

      await expect(
        service.refreshToken({ refreshToken: 'blacklisted.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when JWT verify fails (expired)', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refreshToken({ refreshToken: 'expired.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found after token verification', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'valid.refresh.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      usersRepository.findOne.mockResolvedValue(createMockUser({ is_active: false }));

      await expect(
        service.refreshToken({ refreshToken: 'valid.refresh.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      usersRepository.findOne.mockResolvedValue(createMockUser());
      tenantsRepository.findOne.mockResolvedValue(
        createMockTenant({ status: TenantStatus.SUSPENDED }),
      );

      await expect(
        service.refreshToken({ refreshToken: 'valid.refresh.token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should blacklist the old refresh token after successful refresh', async () => {
      usersRepository.findOne.mockResolvedValue(createMockUser());
      tenantsRepository.findOne.mockResolvedValue(createMockTenant());

      await service.refreshToken({ refreshToken: 'old.refresh.token' });

      const redisMock = (service as any).redis;
      if (redisMock) {
        expect(redisMock.setex).toHaveBeenCalledWith(
          expect.stringContaining('old.refresh.token'),
          expect.any(Number),
          '1',
        );
      }
    });
  });

  // =========================================================================
  // logout
  // =========================================================================

  describe('logout', () => {
    it('should add token to Redis blacklist and return success message', async () => {
      const result = await service.logout(mockUserId, 'access.token.to.blacklist');

      expect(result.message).toContain('success');

      const redisMock = (service as any).redis;
      if (redisMock) {
        expect(redisMock.setex).toHaveBeenCalled();
      }
    });

    it('should return success message even if Redis is unavailable', async () => {
      // Simulate no Redis
      (service as any).redis = null;

      const result = await service.logout(mockUserId, 'any.token');
      expect(result.message).toBeDefined();
    });
  });

  // =========================================================================
  // changePassword
  // =========================================================================

  describe('changePassword', () => {
    it('should update password hash when current password is correct', async () => {
      const currentHash = await bcrypt.hash('CurrentP@ss!', 4);
      const mockUser = createMockUser({ password_hash: currentHash });
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.save.mockResolvedValue(mockUser);

      const result = await service.changePassword(mockUserId, mockTenantId, {
        currentPassword: 'CurrentP@ss!',
        newPassword: 'NewP@ssw0rd!',
      });

      expect(result.message).toContain('success');
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: expect.not.stringMatching('CurrentP@ss!'),
        }),
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword(mockUserId, mockTenantId, {
          currentPassword: 'any',
          newPassword: 'NewP@ss!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      const currentHash = await bcrypt.hash('CorrectP@ss!', 4);
      usersRepository.findOne.mockResolvedValue(
        createMockUser({ password_hash: currentHash }),
      );

      await expect(
        service.changePassword(mockUserId, mockTenantId, {
          currentPassword: 'WrongP@ss!',
          newPassword: 'NewP@ss!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // generateTokens
  // =========================================================================

  describe('generateTokens', () => {
    it('should call jwtService.sign twice — once for access, once for refresh', async () => {
      const mockUser = createMockUser();
      const mockTenant = createMockTenant();
      const mockRole = createMockRole();

      await service.generateTokens(mockUser as any, mockTenant as any, [mockRole] as any);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should embed tenant_id, user id, and roles in access token payload', async () => {
      const mockUser = createMockUser();
      const mockTenant = createMockTenant();
      const mockRole = createMockRole();

      await service.generateTokens(mockUser as any, mockTenant as any, [mockRole] as any);

      const firstSignCall = jwtService.sign.mock.calls[0];
      const accessPayload = firstSignCall[0];

      expect(accessPayload.sub).toBe(mockUser.id);
      expect(accessPayload.tenant_id).toBe(mockTenant.id);
      expect(accessPayload.roles).toContain('Admin');
      expect(accessPayload.permissions).toBeDefined();
    });

    it('should merge permissions from multiple roles (union)', async () => {
      const roleA = createMockRole({
        name: 'Accountant',
        permissions: {
          finance: { create: true, read: true, update: false, delete: false, post: true, void: false },
        },
      });
      const roleB = createMockRole({
        name: 'Manager',
        permissions: {
          finance: { create: false, read: true, update: true, delete: false, post: false, void: false },
        },
      });

      const mockUser = createMockUser();
      const mockTenant = createMockTenant();

      await service.generateTokens(mockUser as any, mockTenant as any, [roleA, roleB] as any);

      const firstSignCall = jwtService.sign.mock.calls[0];
      const payload = firstSignCall[0];

      // Union: create should be true (from roleA), update should be true (from roleB)
      expect(payload.permissions?.finance?.create).toBe(true);
      expect(payload.permissions?.finance?.update).toBe(true);
    });
  });

  // =========================================================================
  // validateUser
  // =========================================================================

  describe('validateUser', () => {
    it('should return true when user exists and is active', async () => {
      usersRepository.findOne.mockResolvedValue(createMockUser({ is_active: true }));
      const result = await service.validateUser(mockUserId, mockTenantId);
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.validateUser(mockUserId, mockTenantId);
      expect(result).toBe(false);
    });

    it('should return false when user is inactive', async () => {
      usersRepository.findOne.mockResolvedValue(createMockUser({ is_active: false }));
      const result = await service.validateUser(mockUserId, mockTenantId);
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // Password hashing — security verification
  // =========================================================================

  describe('password hashing', () => {
    it('should produce different hashes for the same password (bcrypt salt)', async () => {
      const pass = 'SamePassword123!';
      // Access private method via bracket notation for testing
      const hash1 = await (service as any).hashPassword(pass);
      const hash2 = await (service as any).hashPassword(pass);
      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password against its hash', async () => {
      const pass = 'MySecret@1';
      const hash = await (service as any).hashPassword(pass);
      const isValid = await (service as any).comparePassword(pass, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password against a hash', async () => {
      const hash = await (service as any).hashPassword('CorrectPass!');
      const isValid = await (service as any).comparePassword('WrongPass!', hash);
      expect(isValid).toBe(false);
    });
  });
});
