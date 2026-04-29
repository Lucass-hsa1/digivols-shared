/**
 * @lucass-hsa1/security-mw — middleware Express de segurança.
 *
 * Camadas:
 *  1. IP-based rate limiting (wrappers sobre `express-rate-limit`)
 *  2. Account lockout (per-email, com store plugável)
 *
 * Apps consumidores precisam ter `express` e `express-rate-limit` instalados.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import rateLimitFactory, { type Options as RateLimitOptions } from 'express-rate-limit'

// ── Rate limit defaults ─────────────────────────────────────────────────────

const FIFTEEN_MIN = 15 * 60 * 1000

const AUTH_LOGIN_DEFAULTS: Partial<RateLimitOptions> = {
  windowMs: FIFTEEN_MIN,
  max: 5,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
}

const AUTH_RESET_DEFAULTS: Partial<RateLimitOptions> = {
  windowMs: FIFTEEN_MIN,
  max: 3,
  message: { error: 'Muitas solicitações de redefinição de senha. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
}

const API_GENERAL_DEFAULTS: Partial<RateLimitOptions> = {
  windowMs: FIFTEEN_MIN,
  max: 200,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
}

/** Login: 5 tentativas / 15 min / IP. */
export function createAuthLoginLimiter(overrides: Partial<RateLimitOptions> = {}): RequestHandler {
  return rateLimitFactory({ ...AUTH_LOGIN_DEFAULTS, ...overrides } as RateLimitOptions)
}

/** Reset de senha: 3 pedidos / 15 min / IP. */
export function createAuthResetPasswordLimiter(
  overrides: Partial<RateLimitOptions> = {},
): RequestHandler {
  return rateLimitFactory({ ...AUTH_RESET_DEFAULTS, ...overrides } as RateLimitOptions)
}

/** API geral: 200 req / 15 min / IP. */
export function createApiGeneralLimiter(overrides: Partial<RateLimitOptions> = {}): RequestHandler {
  return rateLimitFactory({ ...API_GENERAL_DEFAULTS, ...overrides } as RateLimitOptions)
}

/** Re-export do `rateLimit` original pra customizações livres. */
export { rateLimitFactory as rateLimit }

// ── Account lockout ─────────────────────────────────────────────────────────

export interface LoginAttempt {
  email: string
  ipAddress: string
  success: boolean
  createdAt: Date
}

/**
 * Interface plugável de armazenamento de tentativas de login.
 *
 * Implemente em cima do seu DB (Prisma, Knex, raw pg, in-memory pra dev).
 * Veja o adapter de referência Prisma na seção `prismaLoginAttemptStore` abaixo.
 */
export interface LoginAttemptStore {
  /** Persiste uma tentativa de login. */
  recordAttempt(email: string, ipAddress: string, success: boolean): Promise<void>
  /** Quantas tentativas falhas pra esse email desde `since`. */
  countFailedSince(email: string, since: Date): Promise<number>
  /** Quando foi a última tentativa falha pra esse email (ou null). */
  lastFailedAt(email: string): Promise<Date | null>
  /** Opcional: apaga tentativas anteriores a `before`. */
  cleanupOlderThan?(before: Date): Promise<number>
}

export interface AccountLockoutOptions {
  store: LoginAttemptStore
  /** Default 5. */
  maxFailedAttempts?: number
  /** Bloqueio em ms após exceder o limite. Default 15 min. */
  lockoutMs?: number
  /** Janela de contagem de falhas em ms. Default 15 min. */
  windowMs?: number
  /** Se `true`, falhas no store deixam passar (fail-open). Default `true`. */
  failOpen?: boolean
}

export interface LockoutStatus {
  locked: boolean
  lockedUntil: Date | null
  failedAttempts: number
}

export interface AccountLockout {
  /** Verifica status atual de uma conta. */
  isLocked(email: string): Promise<LockoutStatus>
  /** Registra tentativa (sucesso ou falha). */
  record(email: string, ipAddress: string, success: boolean): Promise<void>
  /** Apaga tentativas antigas (chame periodicamente; default: > 7 dias). */
  cleanup(olderThanMs?: number): Promise<number>
  /** Middleware Express: bloqueia se `req.body.email` está locked. */
  middleware: RequestHandler
}

/**
 * Cria uma instância de Account Lockout com o store fornecido.
 *
 * @example
 *   const lockout = createAccountLockout({ store: prismaLoginAttemptStore(prisma) })
 *   app.post('/login', lockout.middleware, async (req, res) => {
 *     // ... processar login
 *     await lockout.record(email, req.ip, success)
 *   })
 */
export function createAccountLockout(opts: AccountLockoutOptions): AccountLockout {
  const max = opts.maxFailedAttempts ?? 5
  const lockoutMs = opts.lockoutMs ?? FIFTEEN_MIN
  const windowMs = opts.windowMs ?? FIFTEEN_MIN
  const failOpen = opts.failOpen ?? true
  const store = opts.store

  async function isLocked(rawEmail: string): Promise<LockoutStatus> {
    const email = rawEmail.toLowerCase().trim()
    const since = new Date(Date.now() - windowMs)
    const failed = await store.countFailedSince(email, since)
    if (failed < max) {
      return { locked: false, lockedUntil: null, failedAttempts: failed }
    }
    const last = await store.lastFailedAt(email)
    if (!last) return { locked: false, lockedUntil: null, failedAttempts: failed }
    const lockedUntil = new Date(last.getTime() + lockoutMs)
    if (lockedUntil > new Date()) {
      return { locked: true, lockedUntil, failedAttempts: failed }
    }
    return { locked: false, lockedUntil: null, failedAttempts: failed }
  }

  async function record(rawEmail: string, ipAddress: string, success: boolean): Promise<void> {
    const email = rawEmail.toLowerCase().trim()
    await store.recordAttempt(email, ipAddress, success)
  }

  async function cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!store.cleanupOlderThan) return 0
    return store.cleanupOlderThan(new Date(Date.now() - olderThanMs))
  }

  const middleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const email = req.body?.email as string | undefined
    if (!email) return next()

    isLocked(email)
      .then(({ locked, lockedUntil, failedAttempts }) => {
        if (locked && lockedUntil) {
          const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
          res.status(429).json({
            error: 'Muitas tentativas de login falhas. Conta temporariamente bloqueada.',
            retryAfter: remainingMinutes,
            message: `Tente novamente em ${remainingMinutes} minuto(s).`,
          })
          return
        }
        ;(res.locals as Record<string, unknown>).loginAttemptInfo = { failedAttempts }
        next()
      })
      .catch((err) => {
        console.warn('[security-mw:lockout] erro ao verificar:', err)
        if (failOpen) next()
        else res.status(500).json({ error: 'Erro ao verificar status de segurança.' })
      })
  }

  return { isLocked, record, cleanup, middleware }
}

/**
 * Adapter de referência pra LoginAttemptStore usando Prisma.
 *
 * Requer um model `LoginAttempt` no seu schema.prisma com:
 *   ```prisma
 *   model LoginAttempt {
 *     id        String   @id @default(uuid())
 *     email     String
 *     ipAddress String
 *     success   Boolean
 *     createdAt DateTime @default(now())
 *     @@index([email, createdAt])
 *   }
 *   ```
 *
 * @example
 *   import { PrismaClient } from '@prisma/client'
 *   const prisma = new PrismaClient()
 *   const store = prismaLoginAttemptStore(prisma)
 */
export function prismaLoginAttemptStore(
  prismaClient: {
    loginAttempt: {
      create: (args: { data: { email: string; ipAddress: string; success: boolean } }) => Promise<unknown>
      count: (args: {
        where: { email: string; success: boolean; createdAt: { gte: Date } }
      }) => Promise<number>
      findFirst: (args: {
        where: { email: string; success: boolean }
        orderBy: { createdAt: 'desc' }
      }) => Promise<{ createdAt: Date } | null>
      deleteMany: (args: { where: { createdAt: { lt: Date } } }) => Promise<{ count: number }>
    }
  },
): LoginAttemptStore {
  return {
    async recordAttempt(email, ipAddress, success) {
      await prismaClient.loginAttempt.create({ data: { email, ipAddress, success } })
    },
    async countFailedSince(email, since) {
      return prismaClient.loginAttempt.count({
        where: { email, success: false, createdAt: { gte: since } },
      })
    },
    async lastFailedAt(email) {
      const row = await prismaClient.loginAttempt.findFirst({
        where: { email, success: false },
        orderBy: { createdAt: 'desc' },
      })
      return row?.createdAt ?? null
    },
    async cleanupOlderThan(before) {
      const result = await prismaClient.loginAttempt.deleteMany({
        where: { createdAt: { lt: before } },
      })
      return result.count
    },
  }
}

/**
 * Adapter in-memory pra dev/teste. NÃO use em produção (estado se perde no restart
 * e não escala entre instâncias).
 */
export function memoryLoginAttemptStore(): LoginAttemptStore {
  const attempts: LoginAttempt[] = []
  return {
    async recordAttempt(email, ipAddress, success) {
      attempts.push({ email, ipAddress, success, createdAt: new Date() })
    },
    async countFailedSince(email, since) {
      return attempts.filter(
        (a) => a.email === email && !a.success && a.createdAt >= since,
      ).length
    },
    async lastFailedAt(email) {
      const filtered = attempts
        .filter((a) => a.email === email && !a.success)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return filtered[0]?.createdAt ?? null
    },
    async cleanupOlderThan(before) {
      const initialLength = attempts.length
      const kept = attempts.filter((a) => a.createdAt >= before)
      attempts.splice(0, attempts.length, ...kept)
      return initialLength - attempts.length
    },
  }
}

export type { Request, Response, NextFunction, RequestHandler } from 'express'
