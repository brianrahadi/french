/**
 * Orders content modules by path: level folder (a1 → b2), then the number at
 * the start of the file name (01-…, 02-…, 10-… in numeric order).
 */
export function inOrder<T>(modules: Record<string, T>): T[] {
  return Object.keys(modules)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((path) => modules[path])
}
