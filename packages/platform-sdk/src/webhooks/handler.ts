import type { WebhookEvent, WebhookEventType } from '../types/webhook-events.js'

/**
 * Mapa tipado de handlers por evento.
 *
 * Cada handler recebe o envelope completo e o payload já tipado.
 * Use junto com `parseWebhook` pra integração end-to-end.
 *
 * @example
 * ```ts
 * const dispatcher = createWebhookDispatcher({
 *   'tenant.created': async ({ payload }) => {
 *     await db.tenantCache.create({ data: payload.tenant })
 *   },
 *   'plan.updated': async ({ payload }) => {
 *     await db.planCache.update({ where: { id: payload.plan.id }, data: payload.plan })
 *   },
 * })
 *
 * await dispatcher(parsedWebhook.event)
 * ```
 */
export type WebhookHandlers = {
  [K in WebhookEventType]?: (event: Extract<WebhookEvent, { eventType: K }>) => Promise<void> | void
}

export interface WebhookDispatcher {
  (event: WebhookEvent): Promise<void>
}

export function createWebhookDispatcher(handlers: WebhookHandlers): WebhookDispatcher {
  return async (event) => {
    const handler = handlers[event.eventType] as
      | ((e: WebhookEvent) => Promise<void> | void)
      | undefined
    if (!handler) {
      // Evento conhecido mas sem handler registrado → ignora silenciosamente
      // (apps podem só assinar parte dos eventos)
      return
    }
    await handler(event)
  }
}
