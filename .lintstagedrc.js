module.exports = {
  "server/**/*.{ts,tsx}": ["npm run --prefix server lint -- --fix", "prettier --write"],
  // next lint não suporta caminhos individuais com parênteses no path (app)/(auth)
  // usar função faz o comando rodar sem passar os arquivos individualmente
  "web/**/*.{ts,tsx}": [() => "npm run --prefix web lint", "prettier --write"],
  "*.{json,md}": ["prettier --write"],
};
