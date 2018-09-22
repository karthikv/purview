export function tryParse<T>(json: string): T {
  try {
    return JSON.parse(json)
  } catch (_) {
    throw new Error(`Invalid JSON: ${json}`)
  }
}
