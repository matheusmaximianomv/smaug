/**
 * Download de arquivo gerado pela API, isolado do resto do app.
 *
 * Existe como costura pelo mesmo motivo de `navigation.ts`: `URL.createObjectURL` e o clique
 * sintético em `<a download>` não existem de forma utilizável no jsdom, então sem esta fronteira
 * o caminho de download ficaria sem cobertura.
 */

const REVOKE_DELAY_MS = 1000;

export function downloadBlob(filename: string, blob: Blob): void {
  if (typeof document === "undefined") return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // O objeto só pode ser liberado depois que o navegador iniciou o download.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

const FILENAME_PATTERN = /filename="?([^";]+)"?/;

/** Nome que o servidor mandou no Content-Disposition; a regra de nomeação mora lá. */
export function filenameFromContentDisposition(
  header: string | undefined,
  fallback: string,
): string {
  const match = header ? FILENAME_PATTERN.exec(header) : null;
  return match?.[1] ?? fallback;
}
