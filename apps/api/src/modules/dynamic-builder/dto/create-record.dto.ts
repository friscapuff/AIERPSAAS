import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class CreateRecordDto {
  @ApiProperty({
    type: Object,
    description: 'Record data object with field values',
    example: { name: 'John Doe', email: 'john@example.com', age: 30 },
  })
  @IsObject()
  data: Record<string, any>;
}
