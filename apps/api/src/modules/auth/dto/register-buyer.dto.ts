import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterBuyerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
