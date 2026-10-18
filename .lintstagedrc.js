module.exports = {
  "server/**/*.{ts,tsx}": ["npm run --prefix server lint -- --fix", "prettier --write"],
  "web/**/*.{ts,tsx}": (files) => {
    const q = files.map((f) => JSON.stringify(f)).join(" ");
    return [
      `npm --prefix web exec -- eslint --config web/eslint.config.mjs ${q}`,
      `prettier --write ${q}`,
    ];
  },
  "e2e/**/*.ts": ["prettier --write"],
  "*.{json,md}": ["prettier --write"],
};
