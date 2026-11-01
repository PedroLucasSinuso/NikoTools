// Reproduz em Node o mesmo caminho do site (pdf.js -> limpeza -> Tesseract) e salva as linhas lidas
// (com confiança) como fixture dos testes do parser.
// Uso: npm run gerar-fixture -- "../amostras/estoque.pdf" tests/fixtures/estoque.json
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, writeFileSync } from 'node:fs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { limpaPagina } from '../src/core/preprocesso'

const [arquivo, saida] = process.argv.slice(2)
const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(arquivo)) }).promise
const worker = await createWorker('por', OEM.LSTM_ONLY, { langPath: 'public/tessdata', gzip: true })
await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.SINGLE_BLOCK })

const paginas = []
for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n)
  const viewport = page.getViewport({ scale: 200 / 72 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx as never, viewport, canvas: canvas as never }).promise
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  limpaPagina(pixels as never)
  ctx.putImageData(pixels, 0, 0)
  const { data } = await worker.recognize(canvas.toBuffer('image/png'))
  paginas.push(data.lines.map((l) => ({ texto: l.text.replace(/\n$/, ''), confianca: l.confidence })))
}
await worker.terminate()
writeFileSync(saida, JSON.stringify(paginas, null, 1))
console.log('linhas por página:', paginas.map((p) => p.length))
