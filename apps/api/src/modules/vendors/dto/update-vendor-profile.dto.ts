import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateVendorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  studioName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  headline?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  bio?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  location?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  impactStatement?: string;
}
