import { UserRole, VendorStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(VendorStatus)
  verificationStatus?: VendorStatus;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
