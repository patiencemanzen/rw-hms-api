import { formatNationalId, formatPhone, maskNationalId, maskPhone, normalizePhone } from './mask';

describe('national ID masking', () => {
  it('masks the middle digits of a 16-digit National ID', () => {
    expect(maskNationalId('1198580012345012')).toBe('1 1985 8 *** *** ** 12');
  });

  it('formats a full National ID into its groups', () => {
    expect(formatNationalId('1198580012345012')).toBe('1 1985 8 0012345 0 12');
  });

  it('fully masks a malformed value', () => {
    expect(maskNationalId('12345')).toBe('*****');
  });
});

describe('phone masking', () => {
  it.each(['+250788123456', '250788123456', '0788123456', '788123456', '+250 788 123 456'])(
    'masks %s',
    (phone) => {
      expect(maskPhone(phone)).toBe('+250 788 *** 456');
    },
  );

  it('formats and normalizes Rwandan numbers', () => {
    expect(formatPhone('0788123456')).toBe('+250 788 123 456');
    expect(normalizePhone('0788 123 456')).toBe('+250788123456');
    expect(normalizePhone('123')).toBeUndefined();
  });
});
