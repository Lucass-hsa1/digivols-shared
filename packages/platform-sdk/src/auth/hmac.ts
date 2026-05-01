import crypto from 'node:crypto'

/**
 * Calcula HMAC-SHA256 hex de uma string.
 */
export function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

/**
 * Compara duas strings em tempo constante. Use sempre que comparar
 * uma signature recebida com a esperada.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Formato canônico para assinar uma request service-to-service:
 *   "<method>\n<path>\n<timestamp>\n<bodyHash>"
 *
 * bodyHash = sha256 hex do corpo (string vazia se sem body).
 */
export function buildSignaturePayload(params: {
  method: string
  path: string
  timestamp: number | string
  body: string | Buffer | undefined
}): string {
  const bodyStr = params.body == null ? '' : typeof params.body === 'string' ? params.body : params.body.toString('utf8')
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex')
  return [params.method.toUpperCase(), params.path, String(params.timestamp), bodyHash].join('\n')
}

export interface ServiceSignatureHeaders {
  'X-App-Id': string
  'X-Timestamp': string
  'X-Signature': string
}

/**
 * Gera headers de assinatura pra request service-to-service.
 */
export function signServiceRequest(params: {
  appId: string
  appSecret: string
  method: string
  path: string
  body?: string | Buffer
  timestamp?: number  // opcional pra testes determinísticos
}): ServiceSignatureHeaders {
  const ts = params.timestamp ?? Math.floor(Date.now() / 1000)
  const payload = buildSignaturePayload({
    method: params.method,
    path: params.path,
    timestamp: ts,
    body: params.body,
  })
  const signature = hmacSha256Hex(params.appSecret, payload)
  return {
    'X-App-Id': params.appId,
    'X-Timestamp': String(ts),
    'X-Signature': signature,
  }
}

export interface VerifyServiceRequestParams {
  appSecret: string
  method: string
  path: string
  body?: string | Buffer
  appIdHeader?: string
  timestampHeader?: string
  signatureHeader?: string
  /** Tolerância anti-replay em segundos. Default 300 (5 min). */
  toleranceSeconds?: number
}

export interface VerifyResult {
  valid: boolean
  reason?: 'missing_headers' | 'expired' | 'bad_signature'
}

/**
 * Verifica HMAC + timestamp de request service-to-service.
 */
export function verifyServiceRequest(params: VerifyServiceRequestParams): VerifyResult {
  const { appSecret, method, path, body, appIdHeader, timestampHeader, signatureHeader } = params
  const tolerance = params.toleranceSeconds ?? 300

  if (!appIdHeader || !timestampHeader || !signatureHeader) {
    return { valid: false, reason: 'missing_headers' }
  }

  const ts = Number(timestampHeader)
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: 'missing_headers' }
  }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > tolerance) {
    return { valid: false, reason: 'expired' }
  }

  const expected = hmacSha256Hex(
    appSecret,
    buildSignaturePayload({ method, path, timestamp: ts, body }),
  )

  if (!timingSafeEqual(expected, signatureHeader)) {
    return { valid: false, reason: 'bad_signature' }
  }

  return { valid: true }
}

// Webhook signing usa o mesmo HMAC, mas com formato diferente:
// header `X-Signature` contém apenas hmac do body cru (eventId + eventType + payload string).
// Isso é mais simples pq webhook é POST com body fixo.

export function signWebhookBody(secret: string, body: string): string {
  return hmacSha256Hex(secret, body)
}

export function verifyWebhookSignature(secret: string, body: string, signature: string): boolean {
  const expected = signWebhookBody(secret, body)
  return timingSafeEqual(expected, signature)
}
