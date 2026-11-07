import { computeAge, isMinor } from './age';

describe('computeAge', () => {
  const today = new Date('2026-10-30T12:00:00Z');

  it('counts full years when the birthday has passed', () => {
    expect(computeAge('1980-08-14', today)).toBe(46);
  });

  it('does not count the current year before the birthday', () => {
    expect(computeAge('1980-11-02', today)).toBe(45);
  });

  it('counts the birthday itself', () => {
    expect(computeAge('2000-10-30', today)).toBe(26);
  });

  it('returns 0 for newborns', () => {
    expect(computeAge('2026-10-01', today)).toBe(0);
  });

  it('identifies minors', () => {
    expect(isMinor('2010-01-01', today)).toBe(true);
    expect(isMinor('2008-10-30', today)).toBe(false);
  });
});
