# Changesets

Mudanças nos pacotes são descritas com `pnpm changeset`. Cada mudança gera um arquivo `.md` neste diretório que será consolidado em CHANGELOGs no momento da release.

Workflow:

1. Faça mudanças em um pacote.
2. Rode `pnpm changeset` e descreva a mudança (patch/minor/major).
3. Commit + PR.
4. Ao merge em `main`, GitHub Actions cria PR "Version Packages" automaticamente.
5. Quando esse PR é mergeado, os pacotes são publicados em GitHub Packages.

Veja https://github.com/changesets/changesets pra detalhes.
