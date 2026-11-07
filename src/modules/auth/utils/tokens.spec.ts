import { generateToken, hashToken, safeEqual } from './tokens';

describe('token helpers', () => {
  it('generates distinct url-safe tokens', () => {
    const a = generateToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(generateToken()).not.toBe(a);
  });

  it('hashes per secret and purpose', () => {
    const token = generateToken();
    const base = hashToken(token, 'secret-a', 'refresh');
    expect(base).toHaveLength(64);
    expect(hashToken(token, 'secret-a', 'refresh')).toBe(base);
    expect(hashToken(token, 'secret-b', 'refresh')).not.toBe(base);
    expect(hashToken(token, 'secret-a', 'reset')).not.toBe(base);
  });

  it('compares strings without throwing on length mismatch', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
