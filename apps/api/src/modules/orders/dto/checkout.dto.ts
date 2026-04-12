import { IsOptional, IsString, MinLength } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @MinLength(3)
  shippingName!: string;

  @IsString()
  @MinLength(5)
  shippingEmail!: string;

  @IsString()
  @MinLength(5)
  shippingAddressLine1!: string;

  @IsOptional()
  @IsString()
  shippingAddressLine2?: string;

  @IsString()
  @MinLength(2)
  shippingCity!: string;

  @IsString()
  @MinLength(3)
  shippingPostalCode!: string;

  @IsString()
  @MinLength(2)
  shippingCountry!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
