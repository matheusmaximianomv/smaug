/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: "node_modules",
    },
  },
  forbidden: [
    {
      name: "no-server-to-web",
      comment: "O backend não pode importar código do frontend",
      severity: "error",
      from: { path: "^server/" },
      to: { path: "^web/" },
    },
    {
      name: "no-web-to-server",
      comment: "O frontend não pode importar código do backend",
      severity: "error",
      from: { path: "^web/" },
      to: { path: "^server/" },
    },
    {
      name: "no-domain-to-infra",
      comment: "Domain must not depend on infrastructure or presentation",
      severity: "error",
      from: { path: "^server/src/domain" },
      to: { path: "^server/src/(infrastructure|presentation)" },
    },
    {
      name: "no-application-to-infra",
      comment: "Application must not depend on infrastructure or presentation",
      severity: "error",
      from: { path: "^server/src/application" },
      to: { path: "^server/src/(infrastructure|presentation)" },
    },
    {
      name: "auth-crypto-only-in-infra",
      comment:
        "argon2 e jose ficam atrás das portas PasswordHasher/AccessTokenService: só os adapters de server/src/infrastructure os importam",
      severity: "error",
      from: { path: "^server/src/", pathNot: "^server/src/infrastructure/" },
      to: { path: "node_modules/(argon2|jose)/" },
    },
    {
      name: "http-middleware-libs-only-in-presentation",
      comment:
        "cookie-parser e express-rate-limit são detalhe de HTTP: só server/src/presentation os importa",
      severity: "error",
      from: { path: "^server/src/", pathNot: "^server/src/presentation/" },
      to: { path: "node_modules/(cookie-parser|express-rate-limit)/" },
    },
    {
      name: "no-e2e-to-src",
      severity: "error",
      comment: "Os testes E2E sao caixa-preta: falam HTTP, nao importam codigo de server/ ou web/.",
      from: { path: "^e2e/" },
      to: { path: "^(server|web)/" },
    },

    {
      name: "no-circular-dependencies",
      comment: "Evita ciclos entre módulos",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
};
