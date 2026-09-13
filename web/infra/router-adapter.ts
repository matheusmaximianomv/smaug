"use client";

import {
  useRouter as useNextRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export interface RouterAdapter {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
}

export function useRouter(): RouterAdapter {
  const router = useNextRouter();
  return {
    push: router.push,
    replace: router.replace,
    back: router.back,
  };
}

export function useSearchParams() {
  const params = useNextSearchParams();
  return {
    get: (key: string) => params?.get(key) ?? null,
    getAll: (key: string) => params?.getAll(key) ?? [],
  };
}
