import { generateTemporaryId, TEMPORARY_ID_PATTERN } from './temp-id';

describe('generateTemporaryId', () => {
  it('produces TMP-YYYY-XXXXXX', () => {
    const id = generateTemporaryId(new Date('2026-03-01T00:00:00Z'));
    expect(id).toMatch(TEMPORARY_ID_PATTERN);
    expect(id.startsWith('TMP-2026-')).toBe(true);
  });

  it('is random', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateTemporaryId()));
    expect(ids.size).toBe(50);
  });
});
