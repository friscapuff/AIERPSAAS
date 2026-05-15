import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateRecordDto {
  @ApiProperty({
    type: Object,
    description: 'Partial record data object with fields to update',
    example: { name: 'Jane Doe', age: 31 },
  })
  @IsObject()
  data: Record<string, any>;
}
