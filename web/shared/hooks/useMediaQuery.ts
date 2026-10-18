"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      // `matchMedia` só existe no browser: o estado nasce `false` para casar com o HTML do
      // servidor e é corrigido aqui, depois da hidratação. Ler no `useState` causaria
      // mismatch de hidratação. Reescrever com `useSyncExternalStore` está registrado como
      // follow-up (derrubava a cobertura de shared/hooks abaixo de 100%).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}
