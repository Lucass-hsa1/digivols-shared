/**
 * @lucass-hsa1/security-utils — utilitários de segurança compartilhados.
 *
 * Funções universais (browser + Node 20+) que dependem só de `globalThis.crypto`.
 */

/**
 * Alfabeto sem caracteres ambíguos (0/O, 1/I/l/L, etc).
 */
const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function getCryptoOrNull(): Crypto | null {
  try {
    if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.getRandomValues === 'function') {
      return globalThis.crypto
    }
  } catch {
    // ignora
  }
  return null
}

/**
 * Gera uma senha forte aleatória sem caracteres ambíguos.
 *
 * Usa `crypto.getRandomValues` (CSPRNG) quando disponível; cai pra `Math.random` apenas
 * em ambientes muito antigos. Apps em produção devem ter `crypto` disponível.
 *
 * @param length Comprimento desejado (default 10)
 * @param alphabet Alfabeto custom (default: ASCII alfanumérico sem ambíguos)
 */
export function generateStrongPassword(length: number = 10, alphabet: string = SAFE_ALPHABET): string {
  const alpha = alphabet.length > 0 ? alphabet : SAFE_ALPHABET
  const out: string[] = []
  const c = getCryptoOrNull()

  if (c) {
    const arr = new Uint32Array(length)
    c.getRandomValues(arr)
    for (let i = 0; i < length; i++) {
      out.push(alpha.charAt(arr[i]! % alpha.length))
    }
    return out.join('')
  }

  for (let i = 0; i < length; i++) {
    out.push(alpha.charAt(Math.floor(Math.random() * alpha.length)))
  }
  return out.join('')
}

export interface InitialPasswordOptions {
  /**
   * Quando `true`, retorna a senha legacy fixa (`legacyDefault`) — útil em ambientes
   * de demo/onboarding. Default: `false`.
   */
  useLegacyDefault?: boolean
  /** Senha legacy default. Default: `'123'`. Mude pra algo significativo na sua app. */
  legacyDefault?: string
  /** Comprimento da senha forte (quando não usar legacy). Default: 10. */
  length?: number
}

/**
 * Retorna a senha inicial pra um novo usuário.
 *
 * Em apps em produção, prefira sempre `generateStrongPassword`. A flag `useLegacyDefault`
 * existe pra paridade com o comportamento histórico do ProBarber/ProBeauty
 * (envvar `VITE_LEGACY_DEFAULT_PASSWORD=true`).
 */
export function getInitialPassword(opts: InitialPasswordOptions = {}): string {
  if (opts.useLegacyDefault) return opts.legacyDefault ?? '123'
  return generateStrongPassword(opts.length ?? 10)
}

/**
 * Gera um token URL-safe (base32-ish) usando o alfabeto seguro.
 * Não é JWT — é só um identificador opaco.
 *
 * @param length Default 24 caracteres (~143 bits de entropia com SAFE_ALPHABET).
 */
export function generateOpaqueToken(length: number = 24): string {
  return generateStrongPassword(length)
}

/**
 * Gera uma API key no formato `sk_<random>`. Compatível com o padrão do CommHub
 * (`System.apiKey`).
 *
 * @param prefix Prefixo. Default `sk_`.
 * @param length Comprimento da parte aleatória. Default 18.
 */
export function generateApiKey(prefix: string = 'sk_', length: number = 18): string {
  return `${prefix}${generateOpaqueToken(length)}`
}

/**
 * Comparação de strings em tempo constante (timing-safe).
 *
 * Use pra comparar tokens/segredos do header com o valor esperado, evitando
 * que diferenças de tempo revelem prefixos corretos.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) {
    // ainda faz a varredura pra não vazar o tamanho
    let mismatch = 1
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const ca = i < a.length ? a.charCodeAt(i) : 0
      const cb = i < b.length ? b.charCodeAt(i) : 0
      mismatch |= ca ^ cb
    }
    return mismatch === 0 && a.length === b.length
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
