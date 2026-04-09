import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const splitCsv = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value === true || value === 'true';
};

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(splitCsv)
  category?: string[];

  @IsOptional()
  @Transform(splitCsv)
  material?: string[];

  @IsOptional()
  @Transform(splitCsv)
  ecoRating?: string[];

  @IsOptional()
  @Transform(splitCsv)
  artisan?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minImpactScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  madeToOrder?: boolean;

  @IsOptional()
  @IsIn(['featured', 'price-asc', 'price-desc', 'impact-desc', 'newest'])
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'impact-desc' | 'newest';
}
