export const PostgresErrorCode = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
} as const;

function hasStringCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string'
  );
}

// Drizzle wraps driver errors, so the Postgres SQLSTATE can sit on the error itself or on its cause.
export function getPostgresErrorCode(error: unknown): string | undefined {
  if (hasStringCode(error)) return error.code;
  if (error instanceof Error && hasStringCode(error.cause)) return error.cause.code;
  return undefined;
}
