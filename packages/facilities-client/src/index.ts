/**
 * @lucass-hsa1/facilities-client — cliente fetch tipado pra Facilities-Hub.
 *
 * Cobertura atual:
 *   - whatsapp.send
 *   - email.send
 *   - image.compress
 *   - instances.create / get / list / getQrCode / getStatus / delete
 *
 * Uso:
 *   import { createFacilitiesClient } from '@lucass-hsa1/facilities-client'
 *   const hub = createFacilitiesClient({
 *     baseUrl: process.env.FACILITIES_HUB_URL ?? 'https://comm-hub.digivols.com.br',
 *     apiKey: process.env.FACILITIES_HUB_API_KEY!,
 *   })
 *   await hub.whatsapp.send({ number: '+5511999999999', text: 'oi' })
 */

export class FacilitiesClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly bodyText?: string,
  ) {
    super(message)
    this.name = 'FacilitiesClientError'
  }
}

export interface FacilitiesClientOptions {
  /** URL base do hub. Sem barra final. */
  baseUrl: string
  /** API key do System (header `x-api-key`). */
  apiKey: string
  /** fetch custom (default: global). Útil em Node 18- ou pra mocks. */
  fetch?: typeof fetch
  /** Timeout default em ms. Default 30000. */
  defaultTimeoutMs?: number
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  json?: unknown
  body?: BodyInit
  headers?: Record<string, string>
  /** Quando true, retorna o Response cru (não tenta parsear JSON). */
  raw?: boolean
  /** Timeout em ms para esta request. */
  timeoutMs?: number
}

// ── Tipos do Hub ────────────────────────────────────────────────────────────

export type InstanceStatus = 'PENDING' | 'QR_GENERATED' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'

export interface Instance {
  id: string
  instanceName: string
  instanceToken?: string | null
  qrCode?: string | null
  pairingCode?: string | null
  status: InstanceStatus
  systemId: string
  webhookUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateInstanceResult {
  success: boolean
  instance: Instance
  warning?: string
}

export interface QrCodeResult {
  status: InstanceStatus | 'EVOLUTION_NOT_CONFIGURED'
  qrCode?: string | null
  pairingCode?: string | null
  message?: string | null
}

export interface InstanceStatusResult {
  status: InstanceStatus
  instance?: Instance
}

export interface SendWhatsAppParams {
  /** Se omitido, hub usa qualquer instância CONNECTED do sistema. */
  instanceId?: string
  /** E.164 ou só dígitos (hub aplica fallback BR `55…` se < 11 dígitos). */
  number: string
  text: string
}

export interface SendWhatsAppResult {
  success: boolean
  queued: boolean
  evolutionTimeoutMs: number
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export interface ImageCompressOptions {
  /** Default 1200. */
  maxWidth?: number
  /** Default 1200. */
  maxHeight?: number
  /** 1..100. Default 85. */
  quality?: number
  /** Default 'auto' (webp com fallback jpeg). */
  format?: 'jpeg' | 'webp' | 'png' | 'auto'
  /** Hint de Content-Type pra ajudar o multer. Default 'application/octet-stream'. */
  contentType?: string
  /** Nome do arquivo no multipart. Default 'image'. */
  filename?: string
}

export interface ImageCompressResult {
  buffer: Uint8Array
  format: 'jpeg' | 'webp' | 'png'
  width: number
  height: number
  sourceMime: string
}

// ── Cliente ─────────────────────────────────────────────────────────────────

export interface FacilitiesClient {
  whatsapp: {
    send(params: SendWhatsAppParams): Promise<SendWhatsAppResult>
  }
  email: {
    send(params: SendEmailParams): Promise<{ success: boolean; data?: unknown }>
  }
  image: {
    compress(input: Uint8Array | Blob, opts?: ImageCompressOptions): Promise<ImageCompressResult>
  }
  instances: {
    create(name: string, opts?: { webhookUrl?: string }): Promise<CreateInstanceResult>
    get(id: string): Promise<Instance>
    list(): Promise<Instance[]>
    getQrCode(id: string): Promise<QrCodeResult>
    getStatus(id: string): Promise<InstanceStatusResult>
    delete(id: string): Promise<{ success: boolean }>
  }
  /** Health do hub (sem auth). */
  health(): Promise<{ status: string; timestamp: string; evolutionConfigured?: boolean }>
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function looksLikeFormData(body: unknown): body is { append: (k: string, v: unknown, name?: string) => void } {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { append?: unknown }).append === 'function'
  )
}

export function createFacilitiesClient(opts: FacilitiesClientOptions): FacilitiesClient {
  const baseUrl = trimTrailingSlash(opts.baseUrl)
  const apiKey = opts.apiKey
  const customFetch = opts.fetch
  const defaultTimeoutMs = opts.defaultTimeoutMs ?? 30_000

  if (!baseUrl) throw new Error('createFacilitiesClient: baseUrl é obrigatório')
  if (!apiKey) throw new Error('createFacilitiesClient: apiKey é obrigatório')

  const fetchCandidate = customFetch ?? (typeof fetch !== 'undefined' ? fetch : null)
  if (!fetchCandidate) {
    throw new Error('Nenhum `fetch` disponível. Passe um custom em `opts.fetch` (Node < 18).')
  }
  const fetchImpl: typeof fetch = fetchCandidate

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${baseUrl}/api${path}`
    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      ...(options.headers ?? {}),
    }

    let body: BodyInit | undefined = options.body
    if (options.json !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
      body = JSON.stringify(options.json)
    }
    // FormData define seu próprio Content-Type com boundary; nunca sobrescrever.
    if (looksLikeFormData(options.body)) {
      delete headers['Content-Type']
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs)

    let res: Response
    try {
      res = await fetchImpl(url, {
        method: options.method ?? 'GET',
        headers,
        body,
        signal: controller.signal,
      })
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        throw new FacilitiesClientError(408, `Timeout ao chamar ${path}`)
      }
      throw new FacilitiesClientError(0, `Erro de rede em ${path}: ${(err as Error).message}`)
    } finally {
      clearTimeout(timer)
    }

    if (options.raw) {
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new FacilitiesClientError(res.status, text.slice(0, 800) || res.statusText, text)
      }
      return res as unknown as T
    }

    const text = await res.text()
    if (!res.ok) {
      let msg = text.slice(0, 800)
      try {
        const j = JSON.parse(text) as { error?: string; message?: string; details?: unknown }
        msg = String(j.error || j.message || msg)
        if (j.details !== undefined) {
          msg += ` — ${typeof j.details === 'string' ? j.details : JSON.stringify(j.details).slice(0, 200)}`
        }
      } catch {
        // texto puro
      }
      throw new FacilitiesClientError(res.status, msg, text)
    }
    if (!text.trim()) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new FacilitiesClientError(502, 'Resposta JSON inválida do Facilities-Hub', text)
    }
  }

  function sanitizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length <= 11) return `55${digits}`
    return digits
  }

  return {
    async health() {
      const url = `${baseUrl}/api/health`
      const res = await fetchImpl(url, { method: 'GET' })
      if (!res.ok) throw new FacilitiesClientError(res.status, `health falhou: ${res.statusText}`)
      return (await res.json()) as { status: string; timestamp: string; evolutionConfigured?: boolean }
    },

    whatsapp: {
      async send({ instanceId, number, text }) {
        const sanitized = sanitizePhone(number)
        if (!sanitized || sanitized.length < 10) {
          throw new FacilitiesClientError(400, 'Número de telefone inválido')
        }
        return request<SendWhatsAppResult>('/whatsapp/send', {
          method: 'POST',
          json: { instanceId, number: sanitized, text },
        })
      },
    },

    email: {
      async send({ to, subject, html }) {
        if (!to.trim().includes('@')) {
          throw new FacilitiesClientError(400, 'Endereço de email inválido')
        }
        return request<{ success: boolean; data?: unknown }>('/email/send', {
          method: 'POST',
          json: { to: to.trim(), subject: subject.slice(0, 200), html },
        })
      },
    },

    image: {
      async compress(input, opts = {}) {
        if (typeof FormData === 'undefined') {
          throw new Error('FormData não disponível no runtime atual.')
        }

        const blob =
          input instanceof Uint8Array
            ? new Blob([input as BlobPart], { type: opts.contentType ?? 'application/octet-stream' })
            : input

        const form = new FormData()
        const filename = opts.filename ?? 'image'
        form.append('file', blob, filename)
        if (opts.maxWidth !== undefined) form.append('maxWidth', String(opts.maxWidth))
        if (opts.maxHeight !== undefined) form.append('maxHeight', String(opts.maxHeight))
        if (opts.quality !== undefined) form.append('quality', String(opts.quality))
        if (opts.format !== undefined) form.append('format', opts.format)

        const res = (await request<Response>('/image/compress', {
          method: 'POST',
          body: form,
          raw: true,
        })) as Response

        const buf = new Uint8Array(await res.arrayBuffer())
        const headerFormat = res.headers.get('x-image-format')
        const format: 'jpeg' | 'webp' | 'png' =
          headerFormat === 'webp' || headerFormat === 'png' ? headerFormat : 'jpeg'

        return {
          buffer: buf,
          format,
          width: Number(res.headers.get('x-image-width') ?? 0),
          height: Number(res.headers.get('x-image-height') ?? 0),
          sourceMime: res.headers.get('x-image-source-mime') ?? 'image/jpeg',
        }
      },
    },

    instances: {
      async create(name, instOpts = {}) {
        return request<CreateInstanceResult>('/instances', {
          method: 'POST',
          json: { name: String(name).trim() || 'tenant', webhookUrl: instOpts.webhookUrl },
        })
      },
      async get(id) {
        return request<Instance>(`/instances/${encodeURIComponent(id)}`)
      },
      async list() {
        return request<Instance[]>('/instances')
      },
      async getQrCode(id) {
        return request<QrCodeResult>(`/instances/${encodeURIComponent(id)}/qrcode`)
      },
      async getStatus(id) {
        return request<InstanceStatusResult>(`/instances/${encodeURIComponent(id)}/status`)
      },
      async delete(id) {
        return request<{ success: boolean }>(`/instances/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
      },
    },
  }
}

/**
 * Cria um cliente a partir de variáveis de ambiente.
 * Aceita tanto FACILITIES_HUB_* quanto COMM_HUB_* (para BC durante a transição).
 */
export function createFacilitiesClientFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): FacilitiesClient {
  const baseUrl =
    env.FACILITIES_HUB_URL ??
    env.COMM_HUB_URL ??
    'https://comm-hub.digivols.com.br'
  const apiKey = env.FACILITIES_HUB_API_KEY ?? env.COMM_HUB_API_KEY
  if (!apiKey) {
    throw new Error(
      'Defina FACILITIES_HUB_API_KEY (ou COMM_HUB_API_KEY) no ambiente pra usar createFacilitiesClientFromEnv.',
    )
  }
  return createFacilitiesClient({ baseUrl, apiKey })
}
