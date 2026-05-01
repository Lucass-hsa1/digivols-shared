import { signServiceRequest } from '../auth/hmac.js'
import {
  PlatformApiError,
  type PaginatedResponse,
  type PlatformErrorResponse,
} from '../types/common.js'
import type { Tenant } from '../types/tenant.js'
import type { PlatformUser, LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from '../types/user.js'
import type { Plan } from '../types/plan.js'
import type { AuditLogIngestInput, SystemAlertIngestInput } from '../types/audit.js'

export interface PlatformClientOptions {
  /** Base URL da plataforma. Ex: https://superadmin.digivols.com.br/api/v1 */
  baseUrl: string
  /** appId do app cliente. Ex: 'probarber' */
  appId: string
  /** Secret HMAC pra assinar requests. */
  appSecret: string
  /** fetch implementation (default: globalThis.fetch). Útil pra testes. */
  fetchImpl?: typeof fetch
  /** Timeout em ms (default 10000). */
  timeoutMs?: number
}

export class PlatformClient {
  private readonly baseUrl: string
  private readonly appId: string
  private readonly appSecret: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number

  constructor(opts: PlatformClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
    this.appId = opts.appId
    this.appSecret = opts.appSecret
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch
    this.timeoutMs = opts.timeoutMs ?? 10000
  }

  // ─── Internal HTTP ─────────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const fullPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.baseUrl}${fullPath}`
    const bodyStr = body == null ? undefined : JSON.stringify(body)

    const headers: Record<string, string> = {
      ...signServiceRequest({
        appId: this.appId,
        appSecret: this.appSecret,
        method,
        path: fullPath,
        body: bodyStr,
      }),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs)
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        method,
        headers,
        body: bodyStr,
        signal: ctrl.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const text = await res.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        // resposta não-JSON
      }
    }

    if (!res.ok) {
      const err = (parsed as PlatformErrorResponse | null)?.error
      throw new PlatformApiError(
        err?.code ?? `http_${res.status}`,
        err?.message ?? `Request failed with status ${res.status}`,
        res.status,
        err?.details,
      )
    }

    return parsed as T
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  login(input: LoginRequest): Promise<LoginResponse> {
    return this.request('POST', '/auth/login', input)
  }

  refresh(input: RefreshRequest): Promise<RefreshResponse> {
    return this.request('POST', '/auth/refresh', input)
  }

  logout(input: { refreshToken: string }): Promise<{ ok: true }> {
    return this.request('POST', '/auth/logout', input)
  }

  // ─── Resolvers ───────────────────────────────────────────────────────────

  getTenant(id: string): Promise<Tenant> {
    return this.request('GET', `/tenants/${encodeURIComponent(id)}`)
  }

  getTenantBySlug(slug: string): Promise<Tenant> {
    return this.request(
      'GET',
      `/tenants?appId=${encodeURIComponent(this.appId)}&slug=${encodeURIComponent(slug)}`,
    )
  }

  getUser(id: string): Promise<PlatformUser> {
    return this.request('GET', `/users/${encodeURIComponent(id)}`)
  }

  getPlan(id: string): Promise<Plan> {
    return this.request('GET', `/plans/${encodeURIComponent(id)}`)
  }

  // ─── Sync (reconciliação periódica) ───────────────────────────────────────

  syncTenants(sinceIso?: string): Promise<PaginatedResponse<Tenant>> {
    const qs = sinceIso ? `&since=${encodeURIComponent(sinceIso)}` : ''
    return this.request('GET', `/sync/tenants?appId=${this.appId}${qs}`)
  }

  syncPlans(sinceIso?: string): Promise<PaginatedResponse<Plan>> {
    const qs = sinceIso ? `?since=${encodeURIComponent(sinceIso)}` : ''
    return this.request('GET', `/sync/plans${qs}`)
  }

  // ─── Ingest (app → plataforma) ────────────────────────────────────────────

  emitAudit(input: AuditLogIngestInput): Promise<{ ok: true; id: string }> {
    return this.request('POST', '/audit', input)
  }

  emitAlert(input: SystemAlertIngestInput): Promise<{ ok: true; id: string }> {
    return this.request('POST', '/alerts', input)
  }
}
