import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class TenantValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.data === 'tenantId' && !value) {
      throw new BadRequestException('Tenant ID is required');
    }

    // Validate tenant ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (value && !uuidRegex.test(value)) {
      throw new BadRequestException('Invalid tenant ID format');
    }

    return value;
  }
}
