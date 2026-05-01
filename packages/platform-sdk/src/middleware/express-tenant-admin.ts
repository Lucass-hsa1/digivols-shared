import type { Request, RequestHandler } from 'express'
import { verifyPlatformJwt } from '../auth/jwt.js'
import type { PlatformJwtPayload } from '../types/user.js'
import type { AppId } from '../types/common.js'

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireTenantAdmin` middleware after JWT validation. */
      platformUser?: PlatformJwtPayload
      /** O tenant atualmente em escopo da request (resolvido via JWT.currentTenantId). */
      tenantId?: string
    }
  }
}

export interface RequireTenantAdminOptions {
  /** Secret JWT compartilhado com a plataforma. */
  jwtSecret: string
  /** O `appId` desse app. Usado pra validar que o user tem acesso a algum tenant deste app. */
  appId: AppId
  /**
   * Como extrair o token. Default: header `Authorization: Bearer <jwt>`.
   * Sobrescreva pra ler de cookie etc.
   */
  extractToken?: (req: Request) => string | null
  /**
   * Como resolver `tenantId` da request. Default: usa `req.platformUser.currentTenantId`.
   * Pode customizar pra ler de path param, header, etc.
   */
  resolveTenantId?: (req: Request, payload: PlatformJwtPayload) => string | null
}

const defaultExtractToken = (req: Request): string | null => {
  const auth = req.header('authorization') || req.header('Authorization')
  if (!auth) return null
  const m = /^Bearer\s+(.+)$/i.exec(auth)
  return m?.[1] ?? null
}

/**
 * Express middleware que exige um tenant admin autenticado via JWT da plataforma.
 *
 * Em sucesso popula `req.platformUser` e `req.tenantId`.
 * Em falha responde 401.
 */
export function requireTenantAdmin(opts: RequireTenantAdminOptions): RequestHandler {
  const extractToken = opts.extractToken ?? defaultExtractToken
  const resolveTenantId = opts.resolveTenantId ?? ((_req, payload) => payload.currentTenantId ?? null)

  return async (req, res, next) => {
    const token = extractToken(req)
    if (!token) {
      res.status(401).json({ error: { code: 'auth_missing', message: 'Missing JWT' } })
      return
    }

    let payload: PlatformJwtPayload
    try {
      payload = await verifyPlatformJwt(token, opts.jwtSecret)
    } catch {
      res.status(401).json({ error: { code: 'auth_invalid', message: 'Invalid or expired JWT' } })
      return
    }

    // O user precisa ter acesso a pelo menos um tenant deste app
    const tenantsInThisApp = payload.tenants.filter((t) => t.appId === opts.appId)
    if (tenantsInThisApp.length === 0 && payload.role !== 'PLATFORM_OWNER' && payload.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: { code: 'no_tenant_access', message: 'No tenant access for this app' } })
      return
    }

    const resolvedTenantId = resolveTenantId(req, payload)
    if (resolvedTenantId) {
      // Confirma que o user tem acesso a esse tenant específico (a não ser que seja super-admin)
      const hasAccess =
        payload.role === 'PLATFORM_OWNER' ||
        payload.role === 'SUPER_ADMIN' ||
        tenantsInThisApp.some((t) => t.tenantId === resolvedTenantId)
      if (!hasAccess) {
        res.status(403).json({ error: { code: 'tenant_access_denied', message: 'No access to this tenant' } })
        return
      }
      req.tenantId = resolvedTenantId
    }

    req.platformUser = payload
    next()
  }
}
