import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 6;

export const TEMPORARY_ID_PATTERN = /^TMP-\d{4}-[A-HJ-NP-Z2-9]{6}$/;

export function generateTemporaryId(now: Date = new Date()): string {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `TMP-${now.getUTCFullYear()}-${suffix}`;
}
