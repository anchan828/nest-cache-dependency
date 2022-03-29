export function chunk<T extends any[]>(arr: T, size: number): T[] {
  return arr.reduce((newarr, _, i) => (i % size ? newarr : [...newarr, arr.slice(i, i + size)]), []);
}
