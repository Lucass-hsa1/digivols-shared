/**
 * @lucass-hsa1/image-utils — tipos compartilhados.
 * Implementação de runtime: importe de `/browser` (Canvas) ou `/node` (Sharp).
 */

export interface ResizeOptions {
  /** Largura máxima em px. Default: 200. */
  maxWidth?: number
  /** Altura máxima em px. Default: 200. */
  maxHeight?: number
  /** Qualidade do encoder (0..1 no browser, 0..100 no node). */
  quality?: number
  /** Formato de saída. Default browser: 'jpeg'. Default node: 'auto' (webp com fallback jpeg). */
  format?: 'jpeg' | 'webp' | 'png' | 'auto'
  /** Cor de fundo aplicada antes do desenho (útil ao converter PNG→JPEG). Default: '#FFFFFF'. */
  background?: string
}

export type ImageFormat = 'jpeg' | 'webp' | 'png'

export interface CompressResult {
  buffer: Uint8Array
  format: ImageFormat
  width: number
  height: number
  size: number
}
