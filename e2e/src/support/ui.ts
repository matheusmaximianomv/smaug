import type { Locator, Page } from "@playwright/test";
import type { Competence } from "./competence.js";

/**
 * Helpers de localização compartilhados pelos specs.
 *
 * Só entra aqui o que é *estrutural* na UI (o portal do Radix, o par de selects
 * do MonthYearSelect, o KpiCard sem papel próprio). Cópia de texto fica no
 * spec, para que a asserção seja legível no ponto de uso.
 */

/**
 * Espera o React assumir a árvore servida pelo Next.
 *
 * Sem isto há uma corrida REAL, não teórica: enquanto a página não hidrata, um
 * clique no `<button type="submit">` faz submit **nativo** (vira `GET
 * /login?userId=…`) e um clique num botão que só abre modal não faz nada. O
 * React grava `__reactFiber$…` em cada nó host no instante em que passa a
 * controlá-lo — é o sinal mais barato de que os handlers já estão ligados, e
 * vale tanto em `next dev` quanto em `next start`.
 */
export async function waitForHydration(page: Page, selector = "form, main"): Promise<void> {
  await page.waitForFunction((sel) => {
    const nodes = Array.from(document.querySelectorAll(sel));
    // `__reactProps$` só é gravado em nós host que REALMENTE receberam props
    // (onSubmit, onClick, className). O overlay do `next dev` vive dentro de um
    // shadow root, então não satisfaz este seletor por engano.
    return nodes.some((node) => Object.keys(node).some((k) => k.startsWith("__reactProps$")));
  }, selector);
}

/**
 * `page.goto` que só devolve o controle com a página já hidratada.
 *
 * O sintoma de pular esta espera é traiçoeiro: o `<input type="email">` faz o
 * browser BARRAR o submit nativo pela validação de constraint, então a página
 * fica parada, sem erro do React e sem navegação — parecendo bug de produção.
 */
export async function goto(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForHydration(page);
}

/** O conteúdo do Modal vive num portal do Radix — `getByRole` atravessa. */
export function dialog(page: Page): Locator {
  return page.getByRole("dialog");
}

/**
 * `MonthYearSelect` renderiza dois `<select>` com `aria-label`
 * `"<label> — mês"` e `"<label> — ano"`. Os values são o número do mês (1–12)
 * e o ano com quatro dígitos.
 */
export async function fillCompetence(
  scope: Page | Locator,
  label: string,
  competence: Competence,
): Promise<void> {
  await scope.getByLabel(`${label} — mês`).selectOption(String(competence.month));
  await scope.getByLabel(`${label} — ano`).selectOption(String(competence.year));
}

/**
 * O KpiCard não expõe papel nem testid: o rótulo é um `<span>` cujo pai é o
 * cartão inteiro. Subir um nível é o que dá escopo para o valor e o sublabel.
 */
export function kpiCard(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).locator("xpath=..");
}

/**
 * Badge de status do `MonthNavigator` ("Mês vigente" / "Passado" / "Projeção").
 *
 * O texto sozinho é ambíguo: "Projeção" também é legenda do gráfico semestral, e
 * o `<span>` do badge e o `<div>` que o embrulha casam os dois. Ancorar no
 * rótulo do mês resolve — o badge é o irmão seguinte.
 */
export function monthBadge(page: Page, monthLabel: string): Locator {
  return page.getByText(monthLabel, { exact: true }).locator("xpath=following-sibling::div[1]");
}

/** Idem para os blocos do dashboard, que são um `<h3>` seguido do conteúdo. */
export function panel(page: Page, heading: string): Locator {
  return page.getByRole("heading", { name: heading }).locator("xpath=..");
}

/**
 * Esconde os overlays flutuantes do modo de desenvolvimento.
 *
 * Em `next dev` o indicador do Next (canto inferior esquerdo) e o botão do
 * React Query Devtools (canto inferior direito) ficam POR CIMA do `BottomNav`
 * no viewport de celular e interceptam o clique em "Dashboard" e "Histórico".
 * Em CI (`E2E_WEB_MODE=build`) nenhum dos dois existe — sem esta máscara o
 * mesmo teste passaria no CI e falharia na máquina do dev.
 */
export async function hideDevOverlays(page: Page): Promise<void> {
  await page.addStyleTag({
    content: 'nextjs-portal, [class*="tsqd"] { display: none !important; }',
  });
}

/** Largura horizontal real do documento, para o gate de estouro no mobile. */
export async function documentOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}
