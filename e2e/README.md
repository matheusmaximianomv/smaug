# Testes E2E (Playwright)

## A switch de testes

`npm run test:e2e` (na raiz) é a chave: um comando **cria um arquivo SQLite
exclusivo desta execução**, sobe a stack contra ele, roda os testes e **descarta
o arquivo** ao final.

```
e2e/.tmp/smaug-e2e-<timestamp>-<uuid>.db
```

O ciclo vive em `scripts/run-e2e.mjs`, e não no `globalSetup` do Playwright,
porque o `webServer` do Playwright é um _plugin_ e sobe **antes** do
`globalSetup` — criar o banco lá derrubaria o inode debaixo da conexão que o
Express já abriu. O wrapper também é o único lugar que consegue limpar depois de
os servidores morrerem, e que captura `Ctrl-C`.

Se uma execução for morta com `SIGKILL`, o arquivo órfão sobrevive; a execução
seguinte poda tudo que casa com `smaug-e2e-*.db*` antes de começar.

## Comandos

```bash
npm run test:e2e                      # suíte completa
npm run test:e2e -- tests/smoke.spec.ts
npm run test:e2e:ui                   # modo UI
npm run --prefix e2e test:keep-db     # preserva o .db para depuração
E2E_WEB_MODE=build npm run test:e2e   # reproduz o CI localmente
npm run e2e:install-browsers          # uma vez por máquina
npm run --prefix e2e report
```

## Portas

|     | porta | por quê                                                              |
| --- | ----- | -------------------------------------------------------------------- |
| API | 3100  | não colide com o `npm run dev` (3000) — impossível bater no `dev.db` |
| Web | 3101  | idem (3001)                                                          |

## Variáveis

| Variável                        | Default                    | Efeito                                   |
| ------------------------------- | -------------------------- | ---------------------------------------- |
| `E2E_API_PORT` / `E2E_WEB_PORT` | 3100 / 3101                | portas da stack                          |
| `E2E_WEB_MODE`                  | `dev` local, `build` em CI | `next dev` vs `next build && next start` |
| `E2E_TMP_DIR`                   | `e2e/.tmp`                 | onde o SQLite da execução é criado       |
| `E2E_KEEP_DB`                   | —                          | preserva o banco ao final                |
| `E2E_ALL_BROWSERS`              | —                          | habilita firefox e webkit                |

## Regras ao escrever specs

- **Nunca** literais de mês/ano. Tudo deriva de `competence.current`, congelada
  no `globalSetup` e propagada por env para todos os workers.
- **Nunca** semear no passado: a API rejeita competência passada. Estados
  passados ("Pago", "Encerrada") são calculados no cliente — use `shiftClock(n)`
  para **avançar** o relógio do browser.
- Valores de parcela são assertados contra o que a API devolveu, nunca contra
  literais — o arredondamento é regra de domínio.
- Este pacote é **caixa-preta**: não importa nada de `server/` nem de `web/`.
