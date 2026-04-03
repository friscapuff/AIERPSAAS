import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;
  database: {
    connected: boolean;
    responseTime: number;
  };
  memory: {
    usage: NodeJS.MemoryUsage;
    percentUsed: number;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private dataSource: DataSource) {}

  async checkHealth(): Promise<HealthStatus> {
    const dbHealth = await this.checkDatabase();
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const heapUsed = memUsage.heapUsed / memUsage.heapTotal;

    const status: HealthStatus = {
      status: dbHealth.connected ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      version: '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      database: dbHealth,
      memory: {
        usage: memUsage,
        percentUsed: heapUsed * 100,
      },
    };

    return status;
  }

  async checkDependencies() {
    const dbHealth = await this.checkDatabase();
    return {
      status: dbHealth.connected ? 'ready' : 'not-ready',
      checks: {
        database: dbHealth.connected ? 'up' : 'down',
      },
    };
  }

  private async checkDatabase(): Promise<{ connected: boolean; responseTime: number }> {
    const start = Date.now();
    try {
      const connection = this.dataSource.isInitialized;
      if (connection) {
        // Run simple query to verify connectivity
        await this.dataSource.query('SELECT 1');
        return {
          connected: true,
          responseTime: Date.now() - start,
        };
      }
      return {
        connected: false,
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return {
        connected: false,
        responseTime: Date.now() - start,
      };
    }
  }
}
