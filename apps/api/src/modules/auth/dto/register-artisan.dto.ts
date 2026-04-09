import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterArtisanDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(3)
  studioName!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @MinLength(2)
  headline!: string;

  @IsString()
  @MinLength(10)
  bio!: string;

  @IsString()
  @MinLength(2)
  location!: string;

  @IsString()
  @MinLength(10)
  impactStatement!: string;
}
