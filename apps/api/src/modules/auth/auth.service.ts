import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, tenantId: string) {
    // Implement user registration
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    return { message: 'User registered successfully' };
  }

  async login(loginDto: LoginDto, tenantId: string) {
    // Implement user login
    const token = this.jwtService.sign({
      sub: 'userId',
      email: loginDto.email,
      tenantId,
    });
    return { accessToken: token };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // Implement token refresh
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const newToken = this.jwtService.sign({
        sub: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
      });
      return { accessToken: newToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
