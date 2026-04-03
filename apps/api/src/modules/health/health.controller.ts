import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async checkHealth() {
    return this.healthService.checkHealth();
  }

  @Get('live')
  async liveness() {
    return { status: 'alive' };
  }

  @Get('ready')
  async readiness() {
    return this.healthService.checkDependencies();
  }
}
