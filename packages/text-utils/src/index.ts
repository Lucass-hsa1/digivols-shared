/**
 * @lucass-hsa1/text-utils — utilitários de texto compartilhados.
 */

/**
 * Remove acentos diacríticos (NFD + range combining marks U+0300..U+036F).
 *
 * Exemplo:
 *   removeAccents('São João') → 'Sao Joao'
 */
export function removeAccents(text: string): string {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Converte texto livre num slug URL-safe (lowercase, sem acentos, hifens entre palavras).
 *
 * Exemplo:
 *   slugify('Café & Cia. — Açaí no Pote') → 'cafe-cia-acai-no-pote'
 */
export function slugify(text: string): string {
  return removeAccents((text || '').toLowerCase())
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Reduz texto a ASCII visível (printable, espaço a tilde) e limita o tamanho.
 * Útil pra campos com restrição (ex.: PIX BR Code: nome 25 chars, cidade 15 chars).
 *
 * Exemplo:
 *   sanitizeAscii('São Paulo — Centro', 15) → 'Sao Paulo  Cent'
 */
export function sanitizeAscii(value: string, maxLength: number = Number.POSITIVE_INFINITY): string {
  if (!value) return ''
  const stripped = removeAccents(value).replace(/[^\x20-\x7E]/g, '')
  return stripped.trim().slice(0, maxLength)
}

const PHONE_BR_DIGITS_RE = /(\d{2})(\d{4,5})(\d{4})/

/**
 * Formata um telefone BR com DDD em `(XX) XXXX-XXXX` ou `(XX) XXXXX-XXXX`.
 * Retorna o input original se não conseguir parsear.
 */
export function formatPhoneBR(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) return String(phone ?? '')
  return digits.replace(PHONE_BR_DIGITS_RE, '($1) $2-$3')
}

/**
 * Formata número como BRL: `1234.5` → `R$ 1.234,50`.
 */
export function formatBRL(value: number): string {
  if (!Number.isFinite(value)) return ''
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Formata CPF: `12345678901` → `123.456.789-01`.
 * Retorna o input se já estiver formatado ou inválido.
 */
export function formatCPF(cpf: string | null | undefined): string {
  const digits = String(cpf ?? '').replace(/\D/g, '')
  if (digits.length !== 11) return String(cpf ?? '')
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CNPJ: `12345678000190` → `12.345.678/0001-90`.
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  const digits = String(cnpj ?? '').replace(/\D/g, '')
  if (digits.length !== 14) return String(cnpj ?? '')
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata CEP: `01310100` → `01310-100`.
 */
export function formatCEP(cep: string | null | undefined): string {
  const digits = String(cep ?? '').replace(/\D/g, '')
  if (digits.length !== 8) return String(cep ?? '')
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2')
}
