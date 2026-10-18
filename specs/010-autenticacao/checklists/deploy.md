# Deploy Checklist: Autenticação com e-mail e senha

**Purpose**: Conferir a publicação da 010 e o corte da versão `X-User-Id`, na ordem
**Created**: 2026-10-18
**Feature**: [spec.md](../spec.md) | **Procedimento**: [deploy.md](../deploy.md)

Marque cada item no momento do deploy de produção. Os números entre parênteses apontam a seção de
`deploy.md`.

## Antes do corte (versão anterior no ar)

- [ ] CSV completo exportado em `/dados` ("Exportar tudo") e guardado fora do servidor (§ 7.1)
- [ ] Pré-checagem SQL: as duas consultas voltam 0 linhas — e-mails já normalizados e sem duplicata
      após `lower(trim())` (§ 7.2)
- [ ] Proxy reverso TLS pronto na frente do web, **sobrescrevendo** `X-Forwarded-For` com o IP real
      (§ 2)
- [ ] Cenário escolhido: mesma máquina (compose) ou máquinas diferentes, com `API_ORIGIN` e
      `TRUST_PROXY` correspondentes (§ 3)

## Segredos

- [ ] `git check-ignore -v server/.env.secrets` confirma que o arquivo é ignorado (§ 4)
- [ ] `server/.env.secrets` criado com `umask 077` e `chmod 600`, contendo `DATABASE_URL`,
      `JWT_SECRET`, `JWT_KEY_ID`, `PASSWORD_PEPPERS`, `PASSWORD_PEPPER_CURRENT_ID` (§ 4)
- [ ] Cada segredo gerado com `openssl rand -base64 32` (nunca os valores de `.env.example`)
- [ ] Backup do `.env.secrets` (no mínimo o chaveiro de peppers completo) num cofre ou mídia
      cifrada, **separado do backup do banco** (§ 4)
- [ ] Nenhum segredo em `.env.docker`, em `environment:` do compose ou na linha de comando

## Configuração

- [ ] `SMAUG_PUBLIC_ORIGIN=https://<domínio>` (vira `CORS_ORIGIN`; exatamente a origem que o
      navegador vê, sem barra final) (§ 1)
- [ ] `TRUST_PROXY` lista só os saltos entre o Next e a API (compose: `10.250.0.0/24`, igual à
      sub-rede de `networks.default`); nunca `true` (§ 2, § 3)
- [ ] `AUTH_COOKIE_SECURE=true` (padrão do `.env.docker`)
- [ ] Web publicado só em `127.0.0.1` (ou `SMAUG_WEB_BIND=0.0.0.0` com firewall, se o proxy TLS
      estiver em outra máquina) (§ 1)
- [ ] Nenhum `NEXT_PUBLIC_API_URL` sobrando em `.env` do web

## Deploy

- [ ] Server e web publicados **juntos** (`docker compose up -d --build --wait`) (§ 7.4)
- [ ] `docker compose ps`: `api`, `web` e `postgres` healthy; `docker compose port api 3000` → `:0`
      no cenário mesma máquina (§ 5)
- [ ] Migration `20261018150956_add_authentication` aplicada com `ok = t` em `_prisma_migrations`
      (§ 6)
- [ ] Log da API sem `Environment validation failed`

## Verificação pelo web

- [ ] `POST /api/auth/register` (conta de teste) → 201 com
      `Set-Cookie: smaug_refresh=…; Path=/api/auth; HttpOnly; Secure; SameSite=Strict` (§ 5)
- [ ] `POST /api/auth/refresh` → 200 com cookie novo; `GET /api/users/me` com o Bearer → 200
- [ ] `POST /api/auth/logout` → 204 com cookie apagado; refresh depois → 401
- [ ] No navegador, pela origem pública HTTPS: login, recarga sem voltar ao login, logout
- [ ] Rate limit pelo IP real: o 11º cadastro na hora leva 429 mesmo variando `X-Forwarded-For`
- [ ] Conta de teste apagada (ou mantida conscientemente)

## Migração da conta do dono

- [ ] E-mail da conta antiga renomeado para `antigo-<id>@invalid.local` (`UPDATE 1`) (§ 7.5)
- [ ] Conta nova cadastrada pelo `/cadastro` com o mesmo e-mail (§ 7.6)
- [ ] CSV importado **uma vez** em `/dados` (§ 7.7)
- [ ] Lançamentos conferidos: contagem por mês, séries, versões e parcelas; reexportar e comparar com
      o original, desconsiderando `serie_id` (§ 7.7)
- [ ] Conta antiga apagada à mão só depois da conferência (opcional) (§ 7.8)

## Rollback (se preciso)

- [ ] Server e web voltaram à versão anterior juntos
- [ ] Conta nova renomeada ou apagada; renomeação da antiga desfeita (§ 7, Rollback)

## Depois do corte

- [ ] Rotação planejada da chave JWT e do pepper registrada no calendário de operação (§ 8, § 9)
- [ ] **Cadastro não divulgado a terceiros** até a change de recuperação e troca de senha estar no
      ar (§ 12)
