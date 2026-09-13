import { magiScope } from './config/build-plugins/magi-scope'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  main: {
    plugins: [magiScope(), externalizeDepsPlugin()],
    build: {
      outDir: 'out/magi/main',
      rollupOptions: {
        external: ['electron', 'node-pty'],
        input: { index: resolve('src/main/magi/index.ts') },
        output: { format: 'cjs', entryFileNames: 'index.js' }
      }
    }
  },
  preload: {
    plugins: [magiScope(), externalizeDepsPlugin()],
    build: {
      outDir: 'out/magi/preload',
      rollupOptions: {
        external: ['electron'],
        input: { index: resolve('src/preload/magi/index.ts') },
        output: { format: 'cjs', entryFileNames: 'index.js' }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@/i18n/i18n': resolve('src/renderer/src/magi/labels.ts'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [magiScope(), react(), tailwindcss()],
    build: {
      outDir: 'out/magi/renderer',
      minify: true,
      rollupOptions: { input: resolve('src/renderer/magi.html') }
    }
  }
})
