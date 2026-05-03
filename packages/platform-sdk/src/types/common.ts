// Tipos comuns à plataforma. Espelham o schema Prisma do digivols-superadmin.
// Detalhes em /root/digivols-platform-rewrite/01-arquitetura.md

export type AppId = 'probarber' | 'beauty' | 'catalogo'

export const APP_IDS = ['probarber', 'beauty', 'catalogo'] as const

export interface Address {
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zip?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

export interface PlatformError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface PlatformErrorResponse {
  error: PlatformError
}

export class PlatformApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'PlatformApiError'
  }
}
