import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
  artisanProfileId: string | null;
  artisanSlug: string | null;
}
