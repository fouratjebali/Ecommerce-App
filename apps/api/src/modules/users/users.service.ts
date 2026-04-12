import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const authUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  avatarUrl: true,
  artisanProfile: {
    select: {
      id: true,
      slug: true,
      studioName: true,
      verificationStatus: true,
      verified: true,
      location: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        artisanProfile: true,
      },
    });
  }

  findAuthUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: authUserSelect,
    });
  }

  createBuyer(data: { email: string; fullName: string; passwordHash: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: 'BUYER',
      },
      select: authUserSelect,
    });
  }

  createArtisan(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    slug: string;
    studioName: string;
    headline: string;
    bio: string;
    location: string;
    impactStatement: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: 'ARTISAN',
        artisanProfile: {
          create: {
            slug: data.slug,
            studioName: data.studioName,
            headline: data.headline,
            bio: data.bio,
            location: data.location,
            impactStatement: data.impactStatement,
          },
        },
      },
      select: authUserSelect,
    });
  }

  mapPublicUser(user: AuthUserRecord) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      artisanProfile: user.artisanProfile
        ? {
            id: user.artisanProfile.id,
            slug: user.artisanProfile.slug,
            studioName: user.artisanProfile.studioName,
            verificationStatus: user.artisanProfile.verificationStatus,
            verified: user.artisanProfile.verified,
            location: user.artisanProfile.location,
          }
        : null,
    };
  }
}
