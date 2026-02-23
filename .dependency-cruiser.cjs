/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: "node_modules",
    },
    includeOnly: ["^src"],
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/([^/]+)",
      },
    },
  },
  forbidden: [
    {
      name: "no-domain-to-infra",
      comment: "Domain must not depend on infrastructure or presentation",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(infrastructure|presentation)" },
    },
    {
      name: "no-application-to-infra",
      comment: "Application must not depend on infrastructure or presentation",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: "^src/(infrastructure|presentation)" },
    },
  ],
};
