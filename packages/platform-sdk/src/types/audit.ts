import type { AppId } from './common.js'

export interface AuditLog {
  id: string
  appId?: AppId | null
  tenantId?: string | null
  userId?: string | null
  action: string             // ex: "tenant.created", "appointment.canceled"
  entityType?: string | null
  entityId?: string | null
  details: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  occurredAt: string
  createdAt: string
}

export interface AuditLogIngestInput {
  appId: AppId
  tenantId?: string
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  occurredAt?: string  // ISO; default = now()
}

export type AlertType = 'error' | 'warning' | 'info' | 'system'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SystemAlert {
  id: string
  appId?: AppId | null
  tenantId?: string | null
  type: AlertType
  severity: AlertSeverity
  message: string
  context: Record<string, unknown>
  stackTrace?: string | null
  source?: string | null
  isVerified: boolean
  verifiedAt?: string | null
  resolution?: string | null
  occurredAt: string
  createdAt: string
}

export interface SystemAlertIngestInput {
  appId: AppId
  tenantId?: string
  type: AlertType
  severity?: AlertSeverity
  message: string
  context?: Record<string, unknown>
  stackTrace?: string
  source?: string
  occurredAt?: string
}
