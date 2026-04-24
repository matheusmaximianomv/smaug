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
      name: "no-circular-dependencies",
      comment: "Evita ciclos entre módulos",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
};
