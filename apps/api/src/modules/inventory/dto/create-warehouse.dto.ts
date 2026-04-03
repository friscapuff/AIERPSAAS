import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}
