import { IsString, IsUUID } from 'class-validator';

export class SubmitForApprovalDto {
  @IsString()
  documentType: string;

  @IsUUID()
  documentId: string;
}
