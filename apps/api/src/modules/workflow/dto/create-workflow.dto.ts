import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { WorkflowCondition, ApprovalLevel } from '@libs/database';

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsString()
  triggerDocType: string;

  @IsOptional()
  @IsArray()
  conditions?: WorkflowCondition[];

  @IsArray()
  approvalLevels: ApprovalLevel[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
