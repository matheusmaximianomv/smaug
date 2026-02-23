export function withEnv<T>(vars: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const original = { ...process.env };
  Object.assign(process.env, vars);
  return fn().finally(() => {
    process.env = original;
  });
}
