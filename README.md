# digivols-shared

Pacotes npm compartilhados do ecossistema **Digivolution** (Lucas / lucass.hsa1@gmail.com).

Reduz duplicação de código entre os apps em produção (ProBarber Manager, Beauty Manager, Catálogo Plus) e o **Facilities-Hub** (ex-CommHub) em `comm-hub.digivols.com.br` / `facilities-hub.digivols.com.br`.

## Pacotes

| Pacote | Conteúdo | Consumidores |
|--------|----------|--------------|
| `@lucass-hsa1/image-utils` | Compressão e redimensionamento de imagens (browser via Canvas + Node via Sharp) | Os 3 apps |
| `@lucass-hsa1/text-utils` | `slugify`, `sanitizeAscii`, formatadores | Os 3 apps |
| `@lucass-hsa1/security-utils` | `generateStrongPassword`, magic-byte sniffer | Os 3 apps |
| `@lucass-hsa1/security-mw` | Middleware Express: rate-limit IP, lockout por conta | Os 3 apps |
| `@lucass-hsa1/facilities-client` | Cliente fetch tipado pra Facilities-Hub | Os 3 apps + super-admin |
| `@lucass-hsa1/superadmin-types` | DTOs canônicos: `Tenant`, `User`, `Plan`, `Transaction` | Os 3 apps + super-admin |
| `@lucass-hsa1/superadmin-ui` | Componentes React compartilhados do painel super-admin | Painel super-admin |

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Build**: tsup (dual ESM + CJS, types `.d.ts`)
- **Versioning**: Changesets
- **Publish**: GitHub Packages privado (registry `npm.pkg.github.com`)
- **CI**: GitHub Actions (test + publish em tag)

## Setup local

```bash
pnpm install
pnpm build
pnpm test
```

## Adicionar um pacote em um app consumidor

Em cada app que vai consumir os pacotes (`probarber-manager-mvp`, `beauty-manager`, `catalogo-plus`):

1. Criar `.npmrc` na raiz do app:

   ```
   @lucass-hsa1:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
   ```

2. Definir `GITHUB_PACKAGES_TOKEN` (PAT com escopo `read:packages`) em:
   - Local: `~/.bashrc` ou `.env`
   - Coolify: env var do serviço

3. Instalar:

   ```bash
   npm install @lucass-hsa1/image-utils
   ```

## Publicar uma nova versão

```bash
pnpm changeset           # descrever a mudança
pnpm changeset version   # bump das versões + changelog
git commit -am "chore: release"
git push
git push --tags
```

CI publica automaticamente em GitHub Packages.

## Convenções

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`).
- **Branches**: `feature/<fase>-<nome>`, `fix/<assunto>`. PR → `main` → tag → release.
- **Versões**: SemVer estrito. Breaking changes = major bump + nota explícita no changelog.
- **Sem TODOs no main**: se ficar pendência, abrir issue.

## Por que `@lucass-hsa1/*` e não `@digivols/*`

GitHub Packages exige que o scope npm bata com o user/org GitHub. A conta atual é `Lucass-hsa1` (user, não org). Caso uma org `digivols` seja criada no futuro, basta:
1. Transferir os repos pra org.
2. Atualizar `name` em cada `package.json` do `@lucass-hsa1/x` → `@digivols/x`.
3. Bump major + publicar.
4. Atualizar imports nos consumidores.

Migração não-bloqueante.
