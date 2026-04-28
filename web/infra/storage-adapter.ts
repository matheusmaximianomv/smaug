function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${days * 86400};SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=;path=/;max-age=0`;
}

export const StorageAdapter = {
  get: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },

  set: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
    setCookie(key, value);
  },

  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
    deleteCookie(key);
  },

  clear: (): void => {
    if (typeof window === "undefined") return;
    localStorage.clear();
  },
};
