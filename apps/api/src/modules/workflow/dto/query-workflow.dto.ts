import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowInstanceStatus } from '@libs/database';

export class QueryWorkflowDto {
  @IsOptional()
  @IsEnum(WorkflowInstanceStatus)
  status?: WorkflowInstanceStatus;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  initiatedBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
