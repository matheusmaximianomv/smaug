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
E2E_WEB_MODE=dev npm run test:e2e     # next dev (hot reload); feche o `npm run dev` antes
npm run e2e:install-browsers          # uma vez por máquina
npm run --prefix e2e report
```

> O modo `dev` exige o `npm run dev` **fechado**: na Next 16 o `next dev` admite uma
> única instância por diretório e falha com "Another next dev server is already
> running". O modo `build` (padrão) convive com o dev aberto.

## Portas

|     | porta | por quê                                                              |
| --- | ----- | -------------------------------------------------------------------- |
| API | 3100  | não colide com o `npm run dev` (3000) — impossível bater no `dev.db` |
| Web | 3101  | idem (3001)                                                          |

## Variáveis

| Variável                        | Default              | Efeito                                                        |
| ------------------------------- | -------------------- | ------------------------------------------------------------- |
| `E2E_API_PORT` / `E2E_WEB_PORT` | 3100 / 3101          | portas da stack                                               |
| `E2E_WEB_MODE`                  | `build` (local e CI) | `next build && next start` vs `next dev`                      |
| `E2E_TMP_DIR`                   | `e2e/.tmp`           | onde o SQLite da execução é criado                            |
| `E2E_KEEP_DB`                   | —                    | preserva o banco ao final                                     |
| `E2E_ALL_BROWSERS`              | —                    | habilita firefox e webkit                                     |
| `E2E_API_HOST`                  | `localhost`          | host da API (`127.0.0.1` põe web e API em origens diferentes) |

## Access token curto

A API do run emite access tokens de **20 s** (`ACCESS_TOKEN_TTL_SECONDS` em
`src/config/env.ts`, repassado ao `serverEnv` do `playwright.config.ts`), e não
os 10 min de produção. Assim a renovação silenciosa (401 → `POST
/api/auth/refresh` → a chamada refeita) roda de verdade: `tests/auth/sessao.spec.ts`
fica parado além da vida do token mais os 5 s de tolerância de relógio da API e
confere que a próxima tela renova sem toast e sem passar por `/login`.

Consequência para quem escreve spec: o `seed` usa o token do cadastro e **não
renova**. Semeie no começo do teste; um seed feito mais de ~25 s depois dele
volta 401.

## Regras ao escrever specs

- **Nunca** literais de mês/ano. Tudo deriva de `competence.current`, congelada
  no `globalSetup` e propagada por env para todos os workers.
- **Nunca** semear no passado pelos `create-*`: a API rejeita competência
  passada. A situação de cada mês (passado/atual/futuro, parcela paga, série
  encerrada) é calculada pelo **servidor**, com o relógio dele — mexer no relógio
  do browser não muda nada. Para ter dado passado (um parcelamento já em
  andamento), importe-o: `seed.importCsv([...])` é o único escritor que dispensa
  a trava de passado.
- Valores de parcela são assertados contra o que a API devolveu, nunca contra
  literais — o arredondamento é regra de domínio.
- Este pacote é **caixa-preta**: não importa nada de `server/` nem de `web/`.
