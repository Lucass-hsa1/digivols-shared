---
'@lucass-hsa1/image-utils': minor
'@lucass-hsa1/text-utils': minor
'@lucass-hsa1/security-utils': minor
'@lucass-hsa1/security-mw': minor
---

Implementação inicial dos pacotes SDK puros (Fases 2-4 do plano Facilities-Hub).

**`@lucass-hsa1/image-utils`** — Compressão e redimensionamento de imagens com entries separados pra browser (Canvas) e Node (Sharp).

- `/browser`: `resizeImage(file, opts)`, `compressToJPEG`, `compressToWebP` — extraído das 3 versões duplicadas em probarber/probeauty/catalogo.
- `/node`: `compressImage(buffer, opts)` (com fallback automático WebP→JPEG), `sniffImageMime`, `validateMagicBytes`.

Sharp é peer-dep opcional. Aceita opções `maxWidth`, `maxHeight`, `quality`, `format`, `background`.

**`@lucass-hsa1/text-utils`** — Utilitários de texto.

- `slugify`, `removeAccents`, `sanitizeAscii` (consolidação de catalogo + probarber pix).
- Formatadores BR: `formatPhoneBR`, `formatBRL`, `formatCPF`, `formatCNPJ`, `formatCEP`.

**`@lucass-hsa1/security-utils`** — Utilitários de segurança universais (browser + Node 20+).

- `generateStrongPassword(length, alphabet?)` — CSPRNG via `globalThis.crypto`, fallback `Math.random`.
- `getInitialPassword(opts)` — com flag `useLegacyDefault` pra paridade com probarber/probeauty.
- `generateOpaqueToken`, `generateApiKey` (formato `sk_xxx`).
- `constantTimeEqual` — comparação timing-safe pra tokens.

**`@lucass-hsa1/security-mw`** — Middleware Express de segurança.

- Wrappers prontos: `createAuthLoginLimiter` (5/15min), `createAuthResetPasswordLimiter` (3/15min), `createApiGeneralLimiter` (200/15min) — defaults extraídos do probarber `rateLimit.js`.
- Account lockout plugável: `createAccountLockout({ store, max, lockoutMs, windowMs })` com store interface aberta.
- Adapters de referência: `prismaLoginAttemptStore(prisma)` e `memoryLoginAttemptStore()` pra dev.

Express e express-rate-limit são peer-deps.
