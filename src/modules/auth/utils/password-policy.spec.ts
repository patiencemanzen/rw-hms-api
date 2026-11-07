import { failedPasswordRules } from './password-policy';

describe('failedPasswordRules', () => {
  it('accepts a password that meets every rule', () => {
    expect(failedPasswordRules('ChangeMe!Dev2026')).toEqual([]);
  });

  it('reports each broken rule', () => {
    expect(failedPasswordRules('short')).toEqual(['minLength', 'uppercase', 'number', 'special']);
    expect(failedPasswordRules('alllowercase123!')).toEqual(['uppercase']);
    expect(failedPasswordRules('NoDigitsHere!!')).toEqual(['number']);
    expect(failedPasswordRules('NoSpecials1234')).toEqual(['special']);
  });

  it('does not count whitespace as a special character', () => {
    expect(failedPasswordRules('Has Spaces 1234')).toEqual(['special']);
  });

  it('accepts non-ASCII uppercase letters', () => {
    expect(failedPasswordRules('Écolemédicale#2026')).toEqual([]);
  });
});
