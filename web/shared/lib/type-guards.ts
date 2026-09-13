export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v);
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function hasProperty<K extends string>(v: unknown, key: K): v is Record<K, unknown> {
  return isObject(v) && key in v;
}

export function isApiError(v: unknown): v is { message: string; statusCode: number } {
  return (
    isObject(v) &&
    isString((v as Record<string, unknown>).message) &&
    isNumber((v as Record<string, unknown>).statusCode)
  );
}
