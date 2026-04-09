import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';

class ProductAttributeValueInputDto {
  @IsString()
  definitionId!: string;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsString()
  valueText?: string;

  @IsOptional()
  @Type(() => Number)
  valueNumber?: number;

  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;
}

export class UpsertProductDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @MinLength(8)
  shortDescription!: string;

  @IsString()
  @MinLength(20)
  description!: string;

  @IsString()
  @MinLength(20)
  story!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  ecoRatingId!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceInCents!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  inventoryCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  impactScore!: number;

  @Type(() => Number)
  @Min(0)
  co2SavedKg!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  leadTimeDays!: number;

  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @IsBoolean()
  isFeatured!: boolean;

  @IsUrl()
  imageUrl!: string;

  @IsString()
  @MinLength(3)
  imageAlt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  materialIds!: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueInputDto)
  attributeValues?: ProductAttributeValueInputDto[];
}
