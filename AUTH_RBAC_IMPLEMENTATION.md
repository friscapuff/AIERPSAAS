# Authentication & RBAC Implementation Guide - Complete Reference

## Quick Navigation

1. **Overview** - Architecture and system design
2. **Implementation Details** - Code-level documentation
3. **Security Features** - Password, token, and isolation security
4. **Configuration** - Environment setup and requirements
5. **API Endpoints** - Complete endpoint reference
6. **Testing** - Verification and test checklist
7. **Troubleshooting** - Common issues and solutions

## 1. Architecture Overview

The authentication and RBAC system is built with:
- **JWT Authentication**: Access tokens (15 min) and refresh tokens (7 days)
- **Password Security**: Bcrypt hashing with 12 salt rounds
- **Token Revocation**: Redis-backed blacklist for logout
- **Multi-tenancy**: Complete tenant isolation at database and application layers
- **Granular Permissions**: Module-level and action-level access control

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│ Client Application                                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────────────────────────────┐
│ NestJS Application                                           │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ AuthController / TenantsController                    │  │
│ └───────────────┬─────────────────────────────────────┬─┘  │
│                 │                                     │     │
│ ┌───────────────▼──────────────┐  ┌─────────────────▼──┐  │
│ │ AuthService                  │  │ TenantsService     │  │
│ │ - register()                 │  │ - createRole()     │  │
│ │ - login()                    │  │ - updateRole()     │  │
│ │ - refreshToken()             │  │ - deleteRole()     │  │
│ │ - logout()                   │  │ - listRoles()      │  │
│ │ - changePassword()           │  │ - suspend()        │  │
│ │ - generateTokens()           │  │ - activate()       │  │
│ └──────────────┬────────────────┘  └──────────────────┘   │
│                │                                          │
│ ┌──────────────▼───────────────┐  ┌────────────────────┐ │
│ │ JwtStrategy                   │  │ RolesGuard         │ │
│ │ - Validates JWT signature     │  │ - Checks roles     │ │
│ │ - Verifies user active        │  │ - Grants/denies    │ │
│ │ - Loads user context          │  │ - Returns 403      │ │
│ └──────────────┬────────────────┘  └────────────────────┘ │
│                │                                          │
└────────────────┼──────────────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────────┐
        │                 │              │
   ┌────▼────┐    ┌───────▼──────┐  ┌───▼────┐
   │ Database │    │   Redis      │  │ JWT    │
   │(Users,   │    │(Token        │  │Secrets │
   │Roles,    │    │Blacklist)    │  │        │
   │Tenants)  │    └──────────────┘  └────────┘
   └──────────┘
```

## 2. Implementation Details

### AuthService Methods

**register(registerDto: RegisterDto): Promise<AuthResponse>**

Transaction Flow:
1. Validate subdomain uniqueness
2. Create Tenant record with default settings
3. Create Admin role with full permissions
4. Hash password using bcrypt (12 rounds)
5. Create User record and assign Admin role
6. Generate access token (15m expiry)
7. Generate refresh token (7d expiry)
8. Return tokens, user, and tenant info
9. Commit transaction (rollback on any error)

Validation Rules:
- Subdomain: 3-50 chars, lowercase alphanumeric + hyphens only
- Password: Min 8 chars, requires uppercase, lowercase, digit

**login(loginDto: LoginDto): Promise<AuthResponse>**

Authentication Flow:
1. Validate tenant exists and is active
2. Find user by email (case-insensitive) and tenantId
3. Verify password using bcrypt.compare()
4. Validate user is_active = true
5. Build role array from user.role
6. Generate token pair
7. Update user.last_login timestamp
8. Return AuthResponse

**refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens>**

Refresh Flow:
1. Check Redis for token revocation
2. Verify refresh token signature
3. Decode token payload
4. Validate user still exists and is_active
5. Validate tenant still exists and is active
6. Generate new token pair
7. Blacklist old refresh token in Redis (TTL = token expiry time)
8. Return new tokens

**logout(userId: string, token: string): Promise<{ message: string }**

Logout Flow:
1. Decode JWT to extract expiration time
2. Calculate TTL (exp - now)
3. Add token to Redis blacklist with TTL
4. Return success message
5. Future requests with this token will be rejected

**changePassword(userId, tenantId, dto): Promise<{ message: string }**

Password Change Flow:
1. Find user by id and tenantId
2. Verify current password matches
3. Hash new password (bcrypt, 12 rounds)
4. Update user.password_hash
5. Save changes
6. Return success

**generateTokens(user, tenant, roles): Promise<AuthTokens>**

Token Generation:
1. Build permissions object from all user roles
2. Merge permissions (union of all allowed actions)
3. Create JWT payload with:
   - sub: userId
   - email: user email
   - tenant_id: tenantId
   - roles: array of role names
   - permissions: { module: { action: boolean } }
   - iat: issue time
4. Sign access token with JWT_SECRET (15m expiry)
5. Sign refresh token with JWT_REFRESH_SECRET (7d expiry)
6. Return { accessToken, refreshToken }

### TenantsService Methods

**createRole(tenantId, dto): Promise<Role>**

Role Creation:
1. Verify tenant exists
2. Check role name is unique within tenant
3. Store permissions as JSONB
4. Set is_system = false
5. Return created role with ID

Permission Structure:
```typescript
{
  "finance": {
    "create": true,
    "read": true,
    "update": true,
    "delete": false,
    "post": true,
    "void": false
  },
  "inventory": { ... }
}
```

**updateRole(tenantId, roleId, dto): Promise<Role>**

Role Update:
1. Find role by id and tenantId
2. Verify role is not a system role
3. Update name, description, permissions
4. Validate unique name within tenant
5. Save changes
6. Return updated role

**deleteRole(tenantId, roleId): Promise<{ message: string }**

Role Deletion:
1. Find role by id and tenantId
2. Verify role is not a system role (is_system = false)
3. Delete role record
4. Return success message

Note: Users assigned to deleted roles will have no permissions

### RolesGuard Logic

Permission Checking Algorithm:

```typescript
1. If no @Roles decorator → Allow
2. If user.roles includes 'admin' or 'super_admin' → Allow
3. For each required permission:
   a. Check user.roles for exact match
   b. Check user.roles for wildcard (module:*)
   c. Check user.permissions[module] exists
   d. If specific actions required:
      - Verify all actions allowed in permissions
4. If all required permissions satisfied → Allow
5. Otherwise → Deny (403)
```

Usage Examples:

```typescript
// Module-level access
@Roles({ module: 'finance' })
async viewDashboard() {}

// Specific actions required
@Roles({ module: 'finance', actions: ['create', 'post'] })
async createJournal() {}

// Multiple modules
@Roles({ module: 'finance' }, { module: 'inventory' })
async viewReport() {}
```

## 3. Security Features

### Password Security

- **Hashing Algorithm**: Bcrypt with PBKDF2 derivative
- **Salt Rounds**: 12 (approximately 1-2 seconds per hash)
- **Minimum Length**: 8 characters
- **Character Requirements**:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
- **Comparison**: Timing-safe bcrypt.compare() prevents timing attacks
- **Storage**: Never logged or displayed
- **Transmission**: HTTPS only in production

### Token Security

- **Signature Algorithm**: HS256 (HMAC-SHA256)
- **Secret Key**: Configurable, minimum 32 characters recommended
- **Access Token**:
  - Expiry: 15 minutes (short-lived to limit exposure)
  - Contains: User context and permissions
  - Used: Authentication for every request
- **Refresh Token**:
  - Expiry: 7 days
  - Stored: Must be in HttpOnly cookie or secure storage
  - Rotation: New refresh token issued with each refresh
  - Revocation: Old token blacklisted in Redis
- **Token Blacklist**:
  - Storage: Redis with TTL matching token expiry
  - Purpose: Revoke tokens on logout
  - Key Format**: token_blacklist:{tokenValue}
  - TTL**: Automatically expires with token

### Multi-tenancy Isolation

- **Tenant Context**:
  - Extracted from JWT at request time
  - Passed through middleware
  - Validated in every service call
  - Set as PostgreSQL session variable
  - Enforced in all SQL queries (WHERE tenant_id = ...)

- **Database Level**:
  - Composite unique constraint: (tenant_id, email)
  - Composite unique constraint: (tenant_id, role_name)
  - All queries include tenant_id filter
  - PostgreSQL RLS policies (optional)

- **Application Level**:
  - TenantMiddleware extracts tenant_id
  - JwtStrategy validates tenant_id in token
  - Every service method includes tenantId parameter
  - @CurrentTenant() decorator injects tenantId

### Role and Permission Isolation

- **System Roles**: Immutable (is_system = true)
  - Cannot be modified
  - Cannot be deleted
  - Always available to tenants
- **Custom Roles**: Mutable (is_system = false)
  - Tenant-specific
  - Fully customizable
  - Can be deleted if not in use
- **Permission Validation**:
  - Enforced at guard level
  - Cached in JWT to reduce DB queries
  - Verified on every protected request

## 4. Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-minimum-32-character-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=different-minimum-32-character-key
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/aierp_db

# Application
NODE_ENV=development
LOG_LEVEL=info
```

### Module Configuration

**AuthModule** (`auth.module.ts`):
```typescript
imports: [
  PassportModule.register({ defaultStrategy: 'jwt' }),
  JwtModule.registerAsync({ ... }),
  TypeOrmModule.forFeature([User, Tenant, Role]),
]
exports: [AuthService, PassportModule, JwtModule]
```

**TenantsModule** (`tenants.module.ts`):
```typescript
imports: [TypeOrmModule.forFeature([Tenant, Role])]
exports: [TenantsService]
```

## 5. API Endpoints

### Authentication Endpoints

**POST /auth/register** (201 Created)

Request:
```json
{
  "subdomain": "acme",
  "tenantName": "Acme Corporation",
  "email": "admin@acme.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Corporation",
    "subdomain": "acme"
  }
}
```

Errors:
- 400: Invalid input (password too weak, invalid email, etc.)
- 409: Subdomain already in use

**POST /auth/login** (200 OK)

Request:
```json
{
  "email": "admin@acme.com",
  "password": "SecurePass123",
  "tenantId": "uuid"
}
```

Response: Same as register

Errors:
- 401: Invalid credentials (email not found or password incorrect)
- 401: User account is inactive
- 401: Tenant not found or is inactive

**POST /auth/refresh** (200 OK)

Headers: `Authorization: Bearer {accessToken}`

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:
```json
{
  "accessToken": "new-jwt-token",
  "refreshToken": "new-refresh-token"
}
```

Errors:
- 401: Invalid or expired refresh token
- 401: Token has been revoked
- 401: User not found or is inactive

**POST /auth/logout** (200 OK)

Headers: `Authorization: Bearer {accessToken}`

Response:
```json
{
  "message": "Logout successful"
}
```

**POST /auth/change-password** (200 OK)

Headers: `Authorization: Bearer {accessToken}`

Request:
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

Response:
```json
{
  "message": "Password changed successfully"
}
```

Errors:
- 400: Current password is incorrect
- 400: New password doesn't meet requirements

### Tenant Endpoints

All tenant endpoints require Bearer token authentication.

**GET /tenants/:id** (200 OK)

Response:
```json
{
  "id": "uuid",
  "name": "Acme Corporation",
  "subdomain": "acme",
  "subscription_plan": "free",
  "status": "active",
  "max_users": 5,
  "settings": {
    "currency": "USD",
    "timezone": "UTC",
    "fiscalYearStart": "01-01",
    "decimalPlaces": 2,
    "enableApprovalWorkflow": false,
    "enableAuditLog": true
  },
  "created_at": "2026-04-03T...",
  "updated_at": "2026-04-03T..."
}
```

**PUT /tenants/:id** (200 OK)

Requires: @Roles({ module: 'admin' })

Request:
```json
{
  "name": "Updated Name",
  "maxUsers": 10
}
```

**PUT /tenants/:id/settings** (200 OK)

Requires: @Roles({ module: 'admin' })

Request:
```json
{
  "currency": "EUR",
  "timezone": "Europe/London",
  "enableApprovalWorkflow": true
}
```

**POST /tenants/:id/suspend** (200 OK)

Requires: @Roles({ module: 'admin' })

Effect: Sets status to SUSPENDED, users cannot login

**POST /tenants/:id/activate** (200 OK)

Requires: @Roles({ module: 'admin' })

Effect: Sets status to ACTIVE, users can login again

### Role Management Endpoints

**GET /tenants/:tenantId/roles** (200 OK)

Response:
```json
[
  {
    "id": "uuid",
    "name": "Finance Manager",
    "description": "Can manage financial records",
    "permissions": {
      "finance": {
        "create": true,
        "read": true,
        "update": true,
        "delete": false,
        "post": true,
        "void": false
      }
    },
    "is_system": false,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

**GET /tenants/:tenantId/roles/:roleId** (200 OK)

Same response as single role object

**POST /tenants/:tenantId/roles** (201 Created)

Requires: @Roles({ module: 'admin' })

Request:
```json
{
  "name": "Finance Manager",
  "description": "Can manage financial records",
  "permissions": {
    "finance": {
      "create": true,
      "read": true,
      "update": true,
      "delete": false,
      "post": true,
      "void": false
    }
  }
}
```

Response: Created role object with ID

Errors:
- 409: Role name already exists

**PUT /tenants/:tenantId/roles/:roleId** (200 OK)

Requires: @Roles({ module: 'admin' })

Request: Partial update (same fields as POST)

Errors:
- 400: Cannot modify system roles

**DELETE /tenants/:tenantId/roles/:roleId** (204 No Content)

Requires: @Roles({ module: 'admin' })

Errors:
- 400: Cannot delete system roles

## 6. Testing

### Unit Test Template

```typescript
describe('AuthService', () => {
  let service: AuthService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, ...mocks],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create tenant and admin user', async () => {
      const dto = { /* ... */ };
      const result = await service.register(dto);
      expect(result.accessToken).toBeDefined();
      expect(result.tenant.id).toBeDefined();
    });

    it('should reject duplicate subdomain', async () => {
      const dto = { subdomain: 'existing' };
      expect(() => service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash password with bcrypt', async () => {
      const dto = { /* ... */ };
      await service.register(dto);
      // Verify password is hashed
      expect(user.password_hash).not.toBe(dto.password);
    });
  });

  describe('login', () => {
    it('should authenticate valid user', async () => {
      const result = await service.login(validLoginDto);
      expect(result.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      expect(() => service.login(invalidPasswordDto))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should update last_login timestamp', async () => {
      await service.login(validLoginDto);
      // Verify last_login is updated
      expect(user.last_login).toBeCloseTo(new Date(), 5000);
    });
  });

  // ... more test cases
});
```

### Integration Test Template

```bash
# Test registration
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "test-corp",
    "tenantName": "Test Corporation",
    "email": "admin@test.com",
    "password": "TestPass123",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "TestPass123",
    "tenantId": "{tenantIdFromRegister}"
  }'

# Test protected endpoint
curl -X GET http://localhost:3000/tenants/{tenantId} \
  -H "Authorization: Bearer {accessToken}"

# Test token refresh
curl -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "{refreshToken}"}'

# Test logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer {accessToken}"
```

## 7. Troubleshooting

### "Invalid credentials" on login

Check:
1. Email matches exactly (case-insensitive matching is applied)
2. Password is correct
3. User account is active (is_active = true)
4. Tenant exists and is active

### "Tenant not found or is inactive"

Check:
1. Tenant ID is correct UUID
2. Tenant status is 'active'
3. Tenant exists in database

### "Token has been revoked"

Cause: Token was blacklisted in Redis
Solution: Get new token pair using refresh token

### "Invalid refresh token"

Check:
1. Refresh token hasn't expired (7 days)
2. Refresh token hasn't been revoked
3. User still exists and is active
4. Tenant still exists and is active

### Redis connection errors

If Redis is unavailable:
- Service still works (logs warning)
- Token blacklist is disabled (logout less secure)
- Resume when Redis comes back online
- Check REDIS_HOST, REDIS_PORT, REDIS_DB

### "Permission denied" (403)

Check:
1. User has role assigned
2. Role has required module permission
3. Role has required action permission
4. Role is not system-restricted

Use JWT decoder at https://jwt.io to inspect token claims.

---

For more detailed information, see FILE_MANIFEST.md and IMPLEMENTATION_SUMMARY.md
