const NATIONAL_ID_PATTERN = /^(\d)(\d{4})(\d)(\d{7})(\d)(\d{2})$/;

export function formatNationalId(nationalId: string): string {
  const match = NATIONAL_ID_PATTERN.exec(nationalId);
  if (!match) return nationalId;
  return match.slice(1).join(' ');
}

export function maskNationalId(nationalId: string): string {
  const match = NATIONAL_ID_PATTERN.exec(nationalId);
  if (!match) return '*'.repeat(nationalId.length);
  const [, category, birthYear, sexDigit, , , checkDigits] = match;
  return `${category} ${birthYear} ${sexDigit} *** *** ** ${checkDigits}`;
}

function toRwandanLocalDigits(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('250')) return digits.slice(3);
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 9) return digits;
  return undefined;
}

export function formatPhone(phone: string): string {
  const local = toRwandanLocalDigits(phone);
  if (!local) return phone;
  return `+250 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function maskPhone(phone: string): string {
  const local = toRwandanLocalDigits(phone);
  if (!local) return '*'.repeat(Math.max(phone.length - 3, 0)) + phone.slice(-3);
  return `+250 ${local.slice(0, 3)} *** ${local.slice(6)}`;
}

export function normalizePhone(phone: string): string | undefined {
  const local = toRwandanLocalDigits(phone);
  return local ? `+250${local}` : undefined;
}
