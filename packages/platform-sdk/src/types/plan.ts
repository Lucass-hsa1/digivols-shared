import type { AppId } from './common.js'

export interface PlanLimits {
  maxTenantsPerOwner?: number
  maxUsersPerTenant?: number
  // App-specific
  maxAppointmentsPerMonth?: number
  maxProducts?: number
  maxOrders?: number
  maxStorageMB?: number
  // Permite adicionar campos sem mudar o tipo
  [key: string]: number | string | boolean | undefined
}

export interface Plan {
  id: string
  appId: AppId
  name: string
  description?: string | null
  price: number
  features: string[]
  modules: string[]
  limits: PlanLimits
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PlanCreateInput {
  appId: AppId
  name: string
  description?: string
  price: number
  features?: string[]
  modules?: string[]
  limits?: PlanLimits
  isActive?: boolean
  sortOrder?: number
}

export interface PlanUpdateInput {
  name?: string
  description?: string | null
  price?: number
  features?: string[]
  modules?: string[]
  limits?: PlanLimits
  isActive?: boolean
  sortOrder?: number
}
