import { IsString, Length } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  @Length(3, 32)
  code!: string;
}
