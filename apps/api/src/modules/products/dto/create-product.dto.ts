import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsString() sku: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() translations?: Record<string, any>;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() categoryId?: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @IsBoolean() includedInBox?: boolean;
  @IsOptional() @IsBoolean() standaloneSale?: boolean;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDesc?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsArray() tagIds?: string[];
  @IsOptional() @IsNumber() @Min(0) stockQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) lowStockAlert?: number;
}
