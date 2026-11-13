import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.constants';
import { auditLogs, type NewAuditLog } from '../../database/schema';
import type { Database, DbExecutor } from '../../database/types/database.types';

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Appends one entry to the audit log. Pass a transaction to commit it with the audited change. */
  async record(entry: NewAuditLog, executor: DbExecutor = this.db): Promise<void> {
    await executor.insert(auditLogs).values(entry);
  }
}
