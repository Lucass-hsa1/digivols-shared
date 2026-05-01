// Eventos de webhook emitidos pela plataforma → app.
// Match com /root/digivols-platform-rewrite/02-contratos-api.md

import type { Tenant } from './tenant.js'
import type { Plan } from './plan.js'
import type { PlatformUser, TenantAccess, TenantAccessRole } from './user.js'

export type WebhookEventType =
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.deactivated'
  | 'tenant.reactivated'
  | 'tenant.deleted'
  | 'tenant.demo_snapshot'
  | 'tenant.demo_restored'
  | 'plan.created'
  | 'plan.updated'
  | 'plan.deleted'
  | 'user.created'
  | 'user.updated'
  | 'user.granted_tenant_access'
  | 'user.revoked_tenant_access'
  | 'user.password_reset'
  | 'user.deactivated'
  | 'billing.charge_created'
  | 'billing.charge_paid'
  | 'billing.tenant_suspended'

export interface WebhookEnvelope<T = unknown> {
  eventId: string
  eventType: WebhookEventType
  timestamp: string
  version: 1
  payload: T
}

// ─── Payloads tipados por evento ─────────────────────────────────────────────

export interface TenantCreatedPayload { tenant: Tenant }
export interface TenantUpdatedPayload { tenant: Tenant; changedFields: string[] }
export interface TenantDeactivatedPayload { tenantId: string; reason?: string }
export interface TenantReactivatedPayload { tenant: Tenant }
export interface TenantDeletedPayload { tenantId: string }
export interface TenantDemoSnapshotPayload { tenantId: string; snapshotId: string; label?: string }
export interface TenantDemoRestoredPayload { tenantId: string; snapshotId: string }

export interface PlanCreatedPayload { plan: Plan }
export interface PlanUpdatedPayload { plan: Plan; changedFields: string[] }
export interface PlanDeletedPayload { planId: string }

export interface UserCreatedPayload { user: PlatformUser; tenantAccess: TenantAccess[] }
export interface UserUpdatedPayload { user: PlatformUser; changedFields: string[] }
export interface UserGrantedTenantAccessPayload {
  userId: string
  tenantId: string
  role: TenantAccessRole
}
export interface UserRevokedTenantAccessPayload {
  userId: string
  tenantId: string
}
export interface UserPasswordResetPayload {
  userId: string
  // Senha temporária NÃO é enviada via webhook por segurança
  // O super-admin gera + entrega via canal seguro pra Lucas
}
export interface UserDeactivatedPayload { userId: string }

export interface BillingChargeCreatedPayload {
  tenantId: string
  chargeId: string
  amount: number
  dueDate: string
  pixCode?: string
}
export interface BillingChargePaidPayload {
  chargeId: string
  paidAt: string
}
export interface BillingTenantSuspendedPayload {
  tenantId: string
  reason: string
}

// ─── Discriminated union pra typed dispatch ─────────────────────────────────

export type WebhookEvent =
  | (WebhookEnvelope<TenantCreatedPayload>     & { eventType: 'tenant.created' })
  | (WebhookEnvelope<TenantUpdatedPayload>     & { eventType: 'tenant.updated' })
  | (WebhookEnvelope<TenantDeactivatedPayload> & { eventType: 'tenant.deactivated' })
  | (WebhookEnvelope<TenantReactivatedPayload> & { eventType: 'tenant.reactivated' })
  | (WebhookEnvelope<TenantDeletedPayload>     & { eventType: 'tenant.deleted' })
  | (WebhookEnvelope<TenantDemoSnapshotPayload>& { eventType: 'tenant.demo_snapshot' })
  | (WebhookEnvelope<TenantDemoRestoredPayload>& { eventType: 'tenant.demo_restored' })
  | (WebhookEnvelope<PlanCreatedPayload>       & { eventType: 'plan.created' })
  | (WebhookEnvelope<PlanUpdatedPayload>       & { eventType: 'plan.updated' })
  | (WebhookEnvelope<PlanDeletedPayload>       & { eventType: 'plan.deleted' })
  | (WebhookEnvelope<UserCreatedPayload>       & { eventType: 'user.created' })
  | (WebhookEnvelope<UserUpdatedPayload>       & { eventType: 'user.updated' })
  | (WebhookEnvelope<UserGrantedTenantAccessPayload> & { eventType: 'user.granted_tenant_access' })
  | (WebhookEnvelope<UserRevokedTenantAccessPayload> & { eventType: 'user.revoked_tenant_access' })
  | (WebhookEnvelope<UserPasswordResetPayload> & { eventType: 'user.password_reset' })
  | (WebhookEnvelope<UserDeactivatedPayload>   & { eventType: 'user.deactivated' })
  | (WebhookEnvelope<BillingChargeCreatedPayload> & { eventType: 'billing.charge_created' })
  | (WebhookEnvelope<BillingChargePaidPayload>    & { eventType: 'billing.charge_paid' })
  | (WebhookEnvelope<BillingTenantSuspendedPayload> & { eventType: 'billing.tenant_suspended' })
