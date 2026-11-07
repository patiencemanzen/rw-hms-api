export function requireId(ids: Map<string, string>, key: string): string {
  const id = ids.get(key);
  if (!id) throw new Error(`Seed reference "${key}" was not created`);
  return id;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const referenceCounters = new Map<string, number>();

export function nextReference(prefix: string, start: number): string {
  const next = (referenceCounters.get(prefix) ?? start) + 1;
  referenceCounters.set(prefix, next);
  return `${prefix}-${next}`;
}
