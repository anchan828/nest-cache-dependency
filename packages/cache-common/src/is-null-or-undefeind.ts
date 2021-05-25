export function isNullOrUndefined<T>(value?: T | null): value is null | undefined {
  return value === undefined || value === null;
}
