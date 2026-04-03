import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateItemDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  unitCost: number;

  @IsNumber()
  sellingPrice: number;
}
