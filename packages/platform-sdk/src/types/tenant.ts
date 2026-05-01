import type { AppId, Address } from './common.js'

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'trial' | 'demo'

export interface Tenant {
  id: string
  appId: AppId
  slug: string
  name: string
  status: TenantStatus
  isDemo: boolean

  ownerName: string
  ownerEmail: string
  ownerPhone?: string | null
  cnpj?: string | null

  address?: Address

  logoUrl?: string | null
  bannerUrl?: string | null

  planId?: string | null
  customPrice?: number | null
  trialEndsAt?: string | null   // ISO timestamp
  nextBillingAt?: string | null

  parentTenantId?: string | null

  /** Campos extras do app (CommHub flags, integrações específicas, etc) */
  metadata: Record<string, unknown>

  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface TenantCreateInput {
  appId: AppId
  slug: string
  name: string
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
  cnpj?: string
  address?: Address
  planId?: string
  isDemo?: boolean
  parentTenantId?: string
  metadata?: Record<string, unknown>
}

export interface TenantUpdateInput {
  name?: string
  status?: TenantStatus
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string | null
  cnpj?: string | null
  address?: Address
  logoUrl?: string | null
  bannerUrl?: string | null
  planId?: string | null
  customPrice?: number | null
  trialEndsAt?: string | null
  nextBillingAt?: string | null
  metadata?: Record<string, unknown>
}
