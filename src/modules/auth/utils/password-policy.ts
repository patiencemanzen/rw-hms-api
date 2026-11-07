export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordRule = 'minLength' | 'uppercase' | 'number' | 'special';

const RULES: Record<PasswordRule, (password: string) => boolean> = {
  minLength: (password) => password.length >= PASSWORD_MIN_LENGTH,
  uppercase: (password) => /\p{Lu}/u.test(password),
  number: (password) => /\d/.test(password),
  special: (password) => /[^\p{L}\p{N}\s]/u.test(password),
};

/** Returns the rules the password breaks; an empty array means it meets the policy. */
export function failedPasswordRules(password: string): PasswordRule[] {
  return (Object.keys(RULES) as PasswordRule[]).filter((rule) => !RULES[rule](password));
}
