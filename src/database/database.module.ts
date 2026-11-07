import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbConfig } from '@/config/db.config';
import { DRIZZLE, PG_POOL } from './database.constants';
import * as schema from './schema';
import type { Database } from './types/database.types';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [dbConfig.KEY],
      useFactory: (config: ConfigType<typeof dbConfig>): Pool =>
        new Pool({ connectionString: config.url, max: 10 }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
