import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/auth/index.ts',
    'src/client/index.ts',
    'src/webhooks/index.ts',
    'src/middleware/express-tenant-admin.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node20',
  external: ['express'],
})
