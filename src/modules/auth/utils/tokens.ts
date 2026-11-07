import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Tokens are stored as keyed hashes so a database leak does not expose usable tokens. */
export function hashToken(token: string, secret: string, purpose: 'refresh' | 'reset'): string {
  return createHmac('sha256', secret).update(`${purpose}:${token}`).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
