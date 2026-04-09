import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { AuthUserRecord, UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterArtisanDto } from './dto/register-artisan.dto';
import { RegisterBuyerDto } from './dto/register-buyer.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async registerBuyer(dto: RegisterBuyerDto) {
    await this.ensureEmailAvailable(dto.email);

    const user = await this.usersService.createBuyer({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash: await hash(dto.password, 10),
    });

    return this.createAuthResponse(user);
  }

  async registerArtisan(dto: RegisterArtisanDto) {
    await this.ensureEmailAvailable(dto.email);
    await this.ensureSlugAvailable(dto.slug);

    const user = await this.usersService.createArtisan({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash: await hash(dto.password, 10),
      slug: dto.slug,
      studioName: dto.studioName,
      headline: dto.headline,
      bio: dto.bio,
      location: dto.location,
      impactStatement: dto.impactStatement,
    });

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const authUser = await this.usersService.findAuthUserById(user.id);

    if (!authUser) {
      throw new UnauthorizedException('Unable to load account.');
    }

    return this.createAuthResponse(authUser);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findAuthUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    return {
      user: this.usersService.mapPublicUser(user),
    };
  }

  private async createAuthResponse(user: AuthUserRecord) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
      user: this.usersService.mapPublicUser(user),
    };
  }

  private async ensureEmailAvailable(email: string) {
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }
  }

  private async ensureSlugAvailable(slug: string) {
    const existingProfile = await this.prisma.artisanProfile.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingProfile) {
      throw new ConflictException('That artisan slug is already in use.');
    }
  }
}
