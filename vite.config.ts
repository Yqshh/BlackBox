import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * `npm run build` — обычная сборка (dist/).
 * `npm run build:single` — один автономный HTML-файл (dist-single/index.html),
 * который можно открыть двойным щелчком и хранить на флешке.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single'

  return {
    base: './',
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    build: {
      target: 'es2022',
      outDir: single ? 'dist-single' : 'dist',
      cssCodeSplit: !single,
      assetsInlineLimit: single ? 100_000_000 : 4096,
      sourcemap: false,
      rollupOptions: {
        output: single
          ? {}
          : {
              manualChunks: {
                react: ['react', 'react-dom', 'react-router-dom'],
                editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/markdown'],
              },
            },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
