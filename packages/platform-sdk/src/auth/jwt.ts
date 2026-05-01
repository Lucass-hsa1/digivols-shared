import { SignJWT, jwtVerify } from 'jose'
import type { PlatformJwtPayload } from '../types/user.js'

/**
 * Verifica e decodifica um JWT da plataforma.
 *
 * Apps usam isso pra validar JWT recebido do user (após proxy de login).
 * Não envolve round-trip — só valida assinatura local com PLATFORM_JWT_SECRET.
 */
export async function verifyPlatformJwt(
  token: string,
  secret: string,
): Promise<PlatformJwtPayload> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
  // O cast confia no shape — em runtime é validado pela jose (assinatura + exp)
  return payload as unknown as PlatformJwtPayload
}

/**
 * Assina um JWT pra usar em sessão de PlatformUser.
 *
 * **Apenas a plataforma (digivols-superadmin) emite JWTs.** Apps NÃO devem
 * usar essa função — usem `verifyPlatformJwt` pra validar tokens recebidos.
 */
export async function signPlatformJwt(
  payload: Omit<PlatformJwtPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds = 3600, // 1 hora
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key)
}

export class JwtVerificationError extends Error {
  public readonly originalCause: unknown
  constructor(originalCause: unknown) {
    super('Failed to verify platform JWT')
    this.name = 'JwtVerificationError'
    this.originalCause = originalCause
  }
}
