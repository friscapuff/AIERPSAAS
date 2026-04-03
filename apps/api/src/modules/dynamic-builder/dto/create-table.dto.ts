import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTableDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  columns: any[];
}
