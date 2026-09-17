import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        phone: registerDto.phone,
        role: registerDto.role || 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    const accessToken = this.signAccessToken(user.id, user.email, user.role);
    const refreshToken = this.signRefreshToken(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.signAccessToken(user.id, user.email, user.role);
    const refreshToken = this.signRefreshToken(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      const newAccessToken = this.signAccessToken(user.id, user.email, user.role);
      const newRefreshToken = this.signRefreshToken(user.id, user.email, user.role);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private signAccessToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role, type: 'access' };
    return this.jwtService.sign(payload, { expiresIn: '1d' });
  }

  private signRefreshToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role, type: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }
}
