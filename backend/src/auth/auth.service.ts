import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { toPublicCharacter } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.character.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username.toLowerCase() }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const character = await this.prisma.character.create({
      data: {
        email: dto.email,
        passwordHash,
        username: dto.username.toLowerCase(),
        displayName: dto.displayName,
        bio: dto.bio,
        backstory: dto.backstory,
        personalityTraits: dto.personalityTraits || [],
      },
    });

    return this.generateTokens(character.id, character.username, character);
  }

  async login(dto: LoginDto) {
    const character = await this.prisma.character.findUnique({ where: { email: dto.email } });
    if (!character || !character.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, character.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(character.id, character.username, character);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const character = await this.prisma.character.findUnique({ where: { id: payload.sub } });
      if (!character || character.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(character.id, character.username, character);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(characterId: string, username: string, character: { id: string; username: string; displayName: string; avatarUrl: string | null; bio: string | null; backstory: string | null; personalityTraits: unknown; createdAt: Date }) {
    const payload = { sub: characterId, username };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    await this.prisma.character.update({
      where: { id: characterId },
      data: { refreshToken },
    });

    return {
      accessToken,
      refreshToken,
      character: toPublicCharacter(character as Parameters<typeof toPublicCharacter>[0]),
    };
  }
}
