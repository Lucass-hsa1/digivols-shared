// SDK oficial da plataforma Digivolution.
//
// Pacote que apps clientes (catalogo-plus, probarber-manager, beauty-manager,
// e qualquer app futuro) usam pra:
//   - Tipos canônicos da plataforma (Tenant, PlatformUser, Plan, etc)
//   - HTTP client pra chamar /api/v1/* da plataforma
//   - Validação de webhooks recebidos
//   - Autenticação service-to-service (HMAC) e user (JWT)
//   - Middleware Express pra proteger rotas que exigem tenant admin
//
// Ver /root/digivols-platform-rewrite/02-contratos-api.md pra contrato completo.

export * from './types/index.js'
export * from './auth/index.js'
export * from './client/index.js'
export * from './webhooks/index.js'
export { requireTenantAdmin } from './middleware/express-tenant-admin.js'
export type {
  RequireTenantAdminOptions,
} from './middleware/express-tenant-admin.js'
