import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortBy {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME = 'name',
}

export class FilterProductDto {
  @ApiPropertyOptional({ example: 'phone' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'category-id-1234' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: SortBy, default: SortBy.NEWEST })
  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
