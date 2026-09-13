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
