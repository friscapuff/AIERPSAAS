import { PartialType } from '@nestjs/swagger';
import { CreateSavedReportDto } from './create-saved-report.dto';

export class UpdateSavedReportDto extends PartialType(CreateSavedReportDto) {}
