/**
 * @lucass-hsa1/image-utils/browser — redimensionamento via Canvas API.
 *
 * Uso:
 *   import { resizeImage } from '@lucass-hsa1/image-utils/browser'
 *   const blob = await resizeImage(file, { maxWidth: 200, maxHeight: 200, quality: 0.6 })
 */

import type { ResizeOptions } from './index'

export interface BrowserResizeOptions extends ResizeOptions {
  /** Default 200. */
  maxWidth?: number
  /** Default 200. */
  maxHeight?: number
  /** 0..1. Default 0.6. */
  quality?: number
  /** Default 'jpeg'. 'auto' é tratado como 'jpeg' no browser. */
  format?: 'jpeg' | 'webp' | 'png' | 'auto'
  /** Default '#FFFFFF'. */
  background?: string
}

const DEFAULTS: Required<Omit<BrowserResizeOptions, 'format'>> & { format: 'jpeg' | 'webp' | 'png' } = {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.6,
  format: 'jpeg',
  background: '#FFFFFF',
}

function resolveMimeType(format: 'jpeg' | 'webp' | 'png'): string {
  if (format === 'webp') return 'image/webp'
  if (format === 'png') return 'image/png'
  return 'image/jpeg'
}

/**
 * Redimensiona e comprime uma imagem no navegador via Canvas, antes de enviar ao backend.
 * Mantém proporção (aspect ratio). Aplica fundo branco antes do desenho pra evitar
 * artefatos ao converter de PNG transparente pra JPEG.
 *
 * @param file Arquivo ou Blob de entrada
 * @param opts Opções (maxWidth, maxHeight, quality, format, background)
 * @returns Promise<Blob> com a imagem redimensionada
 */
export function resizeImage(file: File | Blob, opts: BrowserResizeOptions = {}): Promise<Blob> {
  const maxWidth = opts.maxWidth ?? DEFAULTS.maxWidth
  const maxHeight = opts.maxHeight ?? DEFAULTS.maxHeight
  const quality = opts.quality ?? DEFAULTS.quality
  const format: 'jpeg' | 'webp' | 'png' = opts.format && opts.format !== 'auto' ? opts.format : DEFAULTS.format
  const background = opts.background ?? DEFAULTS.background
  const mimeType = resolveMimeType(format)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem'))

    reader.onload = (event) => {
      const image = new Image()

      image.onerror = () => reject(new Error('Erro ao carregar imagem para redimensionamento'))

      image.onload = () => {
        let { width, height } = image

        // Mantém proporção ao limitar largura/altura
        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto 2D do canvas'))
          return
        }

        // Fundo (default branco) evita transparências indesejadas em JPEG
        if (format !== 'png') {
          ctx.fillStyle = background
          ctx.fillRect(0, 0, width, height)
        }
        ctx.drawImage(image, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Falha ao converter canvas para Blob'))
            }
          },
          mimeType,
          quality,
        )
      }

      image.src = event.target!.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Atalho: comprime para JPEG. Equivalente a `resizeImage(file, { format: 'jpeg', ...opts })`.
 */
export function compressToJPEG(
  file: File | Blob,
  opts: Omit<BrowserResizeOptions, 'format'> = {},
): Promise<Blob> {
  return resizeImage(file, { ...opts, format: 'jpeg' })
}

/**
 * Atalho: comprime para WebP. Browsers modernos suportam (Chrome, Edge, Firefox, Safari 14+).
 */
export function compressToWebP(
  file: File | Blob,
  opts: Omit<BrowserResizeOptions, 'format'> = {},
): Promise<Blob> {
  return resizeImage(file, { ...opts, format: 'webp' })
}

export type { ResizeOptions } from './index'
