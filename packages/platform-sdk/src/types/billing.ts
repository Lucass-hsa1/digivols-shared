export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'canceled' | 'failed'

export interface BillingAccount {
  id: string
  tenantId: string
  pixKey?: string | null
  suspendOnOverdue: boolean
  reminderDays: number
  lockDays: number
  suspendDays: number
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface SaasCharge {
  id: string
  tenantId: string
  amount: number
  status: ChargeStatus
  dueDate: string
  paidAt?: string | null
  paymentMethod?: string | null
  pixCode?: string | null
  pixCodeExpiresAt?: string | null
  externalRef?: string | null
  notes?: string | null
  periodStart: string
  periodEnd: string
  createdAt: string
  updatedAt: string
}

export type LedgerEntryType =
  | 'charge_created'
  | 'charge_paid'
  | 'charge_canceled'
  | 'manual_credit'
  | 'manual_debit'
  | 'refund'

export interface LedgerEntry {
  id: string
  tenantId: string
  chargeId?: string | null
  type: LedgerEntryType
  amount: number
  description?: string | null
  occurredAt: string
  createdAt: string
}
