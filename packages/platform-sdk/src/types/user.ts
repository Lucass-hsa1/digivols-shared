import type { AppId } from './common.js'

export type PlatformRole = 'PLATFORM_OWNER' | 'SUPER_ADMIN' | 'TENANT_ADMIN'

export type TenantAccessRole = 'OWNER' | 'MANAGER' | 'STAFF'

export interface TenantAccess {
  tenantId: string
  appId: AppId
  role: TenantAccessRole
  grantedAt: string
}

export interface PlatformUser {
  id: string
  email: string
  name: string
  phone?: string | null
  role: PlatformRole
  permissions: string[]
  isActive: boolean
  isBlocked: boolean
  blockedReason?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  tenantAccess: TenantAccess[]
}

export interface PlatformUserCreateInput {
  email: string
  name: string
  phone?: string
  role: PlatformRole
  permissions?: string[]
  password: string  // será hash bcrypt no backend
}

export interface PlatformUserUpdateInput {
  name?: string
  phone?: string | null
  role?: PlatformRole
  permissions?: string[]
  isActive?: boolean
  isBlocked?: boolean
  blockedReason?: string | null
}

export interface LoginRequest {
  email: string
  password: string
  tenantSlug?: string  // opcional: validar acesso a tenant específico
}

export interface LoginResponse {
  user: PlatformUser
  jwt: string
  refreshToken: string
  expiresAt: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  jwt: string
  refreshToken: string
  expiresAt: string
}

/** JWT payload assinado pela plataforma */
export interface PlatformJwtPayload {
  sub: string                 // user id
  email: string
  role: PlatformRole
  tenants: TenantAccess[]
  currentTenantId?: string
  iat: number
  exp: number
}
