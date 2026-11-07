export function computeAge(dateOfBirth: string, today: Date = new Date()): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  let age = today.getUTCFullYear() - year;
  const birthdayPassed =
    today.getUTCMonth() + 1 > month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day);
  if (!birthdayPassed) age -= 1;
  return Math.max(age, 0);
}

export function isMinor(dateOfBirth: string, today: Date = new Date()): boolean {
  return computeAge(dateOfBirth, today) < 18;
}
