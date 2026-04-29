/**
 * @lucass-hsa1/image-utils/node — compressão server-side via Sharp.
 *
 * Sharp é peerDependency opcional. Apps consumidores precisam instalar `sharp` próprio.
 * Uso:
 *   import { compressImage } from '@lucass-hsa1/image-utils/node'
 *   const result = await compressImage(buffer, { maxWidth: 1200, quality: 85, format: 'auto' })
 */

import type { CompressResult, ImageFormat, ResizeOptions } from './index'

export interface NodeCompressOptions extends ResizeOptions {
  /** Default 1200. */
  maxWidth?: number
  /** Default 1200. */
  maxHeight?: number
  /** 0..100. Default 85. */
  quality?: number
  /** Default 'auto' (tenta webp, faz fallback pra jpeg em erro). */
  format?: 'jpeg' | 'webp' | 'png' | 'auto'
}

type SharpModule = typeof import('sharp')

let _sharp: SharpModule | null = null
let _sharpLoadAttempted = false

async function getSharp(): Promise<SharpModule> {
  if (_sharp) return _sharp
  if (_sharpLoadAttempted) {
    throw new Error("Pacote 'sharp' não está instalado. Adicione `sharp` às dependências do app consumidor.")
  }
  _sharpLoadAttempted = true
  try {
    const mod = (await import('sharp')) as unknown as { default?: SharpModule } & SharpModule
    _sharp = mod.default ?? mod
    return _sharp
  } catch (err) {
    throw new Error(
      "Pacote 'sharp' não está instalado. Adicione `sharp` às dependências do app consumidor. Detalhe: " +
        (err instanceof Error ? err.message : String(err)),
    )
  }
}

const NODE_DEFAULTS: Required<Omit<NodeCompressOptions, 'background'>> & { background: string } = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85,
  format: 'auto',
  background: '#FFFFFF',
}

/**
 * Comprime e redimensiona uma imagem usando Sharp.
 *
 * Em `format: 'auto'` (default), tenta WebP primeiro e cai pra JPEG se Sharp não conseguir
 * (ex.: imagem corrupta, formato exótico, libwebp ausente no container).
 */
export async function compressImage(
  input: Buffer | Uint8Array,
  opts: NodeCompressOptions = {},
): Promise<CompressResult> {
  const sharp = await getSharp()

  const maxWidth = opts.maxWidth ?? NODE_DEFAULTS.maxWidth
  const maxHeight = opts.maxHeight ?? NODE_DEFAULTS.maxHeight
  const quality = opts.quality ?? NODE_DEFAULTS.quality
  const format: NodeCompressOptions['format'] = opts.format ?? NODE_DEFAULTS.format

  const baseSharp = () =>
    sharp(input, { failOn: 'none' }).resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })

  async function emit(target: ImageFormat): Promise<CompressResult> {
    const builder = baseSharp()
    const built =
      target === 'webp'
        ? builder.webp({ quality })
        : target === 'png'
          ? builder.png({ quality })
          : builder.jpeg({ quality })
    const { data, info } = await built.toBuffer({ resolveWithObject: true })
    return {
      buffer: new Uint8Array(data),
      format: target,
      width: info.width,
      height: info.height,
      size: info.size,
    }
  }

  if (format === 'auto') {
    try {
      return await emit('webp')
    } catch {
      return await emit('jpeg')
    }
  }
  return emit(format)
}

const IMAGE_MAGIC_BYTES: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xff, 0xd8, 0xff]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  'image/gif': new Uint8Array([0x47, 0x49, 0x46, 0x38]),
}

function normalizeMime(mimetype: string): string {
  const m = (mimetype || '').toLowerCase().trim()
  if (m === 'image/jpg' || m === 'image/pjpeg') return 'image/jpeg'
  return m
}

/**
 * Detecta o tipo MIME real pelo conteúdo binário (ignora Content-Type do cliente).
 * Suporta JPEG, PNG, GIF, WebP. Retorna null se não reconhecido.
 */
export function sniffImageMime(buffer: Uint8Array | Buffer): string | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif'
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

/**
 * Valida que os primeiros bytes do buffer correspondem ao MIME type informado.
 * Defesa contra upload com MIME mentido (ex.: PHP renomeado pra .jpg).
 */
export function validateMagicBytes(buffer: Uint8Array | Buffer, mimetype: string): boolean {
  const mime = normalizeMime(mimetype)
  if (mime === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    )
  }
  const magic = IMAGE_MAGIC_BYTES[mime]
  if (!magic) return false
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false
  }
  return true
}

export type { CompressResult, ImageFormat, ResizeOptions } from './index'
