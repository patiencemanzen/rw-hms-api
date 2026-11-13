import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants';
import type { Database } from '../../database/types/database.types';

@Injectable()
export class HealthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }
}
