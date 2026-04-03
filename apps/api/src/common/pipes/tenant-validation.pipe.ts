import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class TenantValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Invalid tenant ID');
    }
    return value;
  }
}
