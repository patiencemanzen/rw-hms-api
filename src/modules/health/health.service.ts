import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorService,
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(
    private readonly healthCheck: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly healthRepository: HealthRepository,
  ) {}

  check(): Promise<HealthCheckResult> {
    return this.healthCheck.check([() => this.checkDatabase()]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check('database');
    try {
      await this.healthRepository.ping();
      return indicator.up();
    } catch {
      return indicator.down({ message: 'Database is unreachable' });
    }
  }
}
