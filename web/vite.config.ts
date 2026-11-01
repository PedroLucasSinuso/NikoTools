/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// BASE_PATH=/nome-do-repo/ pro GitHub Pages (site de projeto); na raiz de um domínio, deixe vazio.
export default defineConfig({
  base: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  test: { include: ['tests/**/*.test.ts'] },
})
