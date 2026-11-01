// Copia o worker e o núcleo WASM do Tesseract pra public/tesseract/, pra o site servir tudo do próprio
// domínio (sem CDN de terceiros: funciona atrás de firewall e o PDF nunca sai do navegador).
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const tessDir = dirname(require.resolve('tesseract.js/package.json'))
const coreDir = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tessDir] }))
const destino = 'public/tesseract'
mkdirSync(destino, { recursive: true })

copyFileSync(join(tessDir, 'dist/worker.min.js'), join(destino, 'worker.min.js'))
// só as variantes LSTM (a gente usa o motor LSTM): com e sem SIMD, pra navegadores antigos
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) {
  if (!existsSync(join(coreDir, f))) throw new Error(`faltou ${f} em ${coreDir}`)
  copyFileSync(join(coreDir, f), join(destino, f))
}
console.log('assets do tesseract copiados')
