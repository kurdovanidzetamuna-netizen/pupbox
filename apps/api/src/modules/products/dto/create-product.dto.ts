import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, Min, Max, MaxLength, ValidateIf } from 'class-validator';
import { DogSize, LifeStage, MarginType } from '@prisma/client';
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
  /** Ingredients a dog could react to (Chicken, Beef, …). Cleaned in the service. */
  @IsOptional() @IsArray() @IsString({ each: true }) allergens?: string[];
  /** { engraving?: { maxLength }, sizes?: string[] }, or null for none. Cleaned by parseConfig. */
  @IsOptional() personalisation?: unknown;
  /** Dog sizes and ages it suits; empty means all. */
  @IsOptional() @IsArray() @IsEnum(DogSize, { each: true }) dogSizes?: DogSize[];
  @IsOptional() @IsArray() @IsEnum(LifeStage, { each: true }) lifeStages?: LifeStage[];
  /** A short "good for" line, e.g. "Strong chewers". Georgian goes in translations.ka.goodFor. */
  @IsOptional() @IsString() @MaxLength(160) goodFor?: string;
  /** Sold for a seller (their id), or null for our own product. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() sellerId?: string | null;
  /** What the seller charges us per unit, and the margin we add on top. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellerPrice?: number;
  @IsOptional() @IsEnum(MarginType) marginType?: MarginType;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000) marginValue?: number;
}
