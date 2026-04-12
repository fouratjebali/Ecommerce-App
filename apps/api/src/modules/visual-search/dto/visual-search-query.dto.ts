import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const splitCsv = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export class VisualSearchQueryDto {
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
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}

export class VisualSearchRecommendationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;

  @IsOptional()
  @IsString()
  category?: string;
}
