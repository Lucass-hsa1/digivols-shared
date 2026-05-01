import { verifyWebhookSignature } from '../auth/hmac.js'
import type {
  WebhookEvent,
  WebhookEventType,
  WebhookEnvelope,
} from '../types/webhook-events.js'

export interface ParsedWebhook {
  eventId: string
  eventType: WebhookEventType
  timestamp: string
  bodyRaw: string
  /** Parsed envelope com payload já tipado por `eventType`. */
  event: WebhookEvent
}

export type WebhookParseError =
  | 'missing_headers'
  | 'bad_signature'
  | 'invalid_body'
  | 'unsupported_event'

export class WebhookValidationError extends Error {
  constructor(public readonly code: WebhookParseError, message?: string) {
    super(message ?? code)
    this.name = 'WebhookValidationError'
  }
}

const KNOWN_EVENT_TYPES: ReadonlySet<WebhookEventType> = new Set<WebhookEventType>([
  'tenant.created',
  'tenant.updated',
  'tenant.deactivated',
  'tenant.reactivated',
  'tenant.deleted',
  'tenant.demo_snapshot',
  'tenant.demo_restored',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'user.created',
  'user.updated',
  'user.granted_tenant_access',
  'user.revoked_tenant_access',
  'user.password_reset',
  'user.deactivated',
  'billing.charge_created',
  'billing.charge_paid',
  'billing.tenant_suspended',
])

export interface ParseWebhookParams {
  appSecret: string
  bodyRaw: string
  headers: {
    eventId?: string
    eventType?: string
    timestamp?: string
    signature?: string
  }
  /** Lista de eventos que esse app aceita. Se ausente, todos são aceitos. */
  acceptedEvents?: readonly WebhookEventType[]
}

/**
 * Valida assinatura + parse de webhook recebido da plataforma.
 *
 * Retorna um envelope tipado. Lança `WebhookValidationError` em falhas.
 *
 * **Importante:** o caller é responsável por dedup via `eventId` em DB
 * antes de processar — esse helper não faz dedup automático.
 */
export function parseWebhook(params: ParseWebhookParams): ParsedWebhook {
  const { appSecret, bodyRaw, headers, acceptedEvents } = params

  if (!headers.eventId || !headers.eventType || !headers.timestamp || !headers.signature) {
    throw new WebhookValidationError('missing_headers')
  }

  if (!verifyWebhookSignature(appSecret, bodyRaw, headers.signature)) {
    throw new WebhookValidationError('bad_signature')
  }

  let envelope: WebhookEnvelope<unknown>
  try {
    envelope = JSON.parse(bodyRaw)
  } catch {
    throw new WebhookValidationError('invalid_body')
  }

  if (!envelope || envelope.eventId !== headers.eventId || envelope.eventType !== headers.eventType) {
    throw new WebhookValidationError('invalid_body', 'Header/body event mismatch')
  }

  if (!KNOWN_EVENT_TYPES.has(envelope.eventType)) {
    throw new WebhookValidationError('unsupported_event', `Unknown event: ${envelope.eventType}`)
  }

  if (acceptedEvents && !acceptedEvents.includes(envelope.eventType)) {
    throw new WebhookValidationError('unsupported_event', `Event ${envelope.eventType} not subscribed`)
  }

  return {
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    timestamp: envelope.timestamp,
    bodyRaw,
    event: envelope as WebhookEvent,
  }
}
