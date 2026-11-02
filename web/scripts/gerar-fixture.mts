// Reproduz em Node o mesmo caminho do site (PDFium -> limpeza -> Tesseract) e salva as linhas lidas
// (com confiança) como fixture dos testes do parser.
// Uso: npm run gerar-fixture -- ../amostras/estoque.pdf tests/fixtures/estoque.json
import { PDFiumLibrary } from '@hyzyla/pdfium'
import { createCanvas } from '@napi-rs/canvas'
import { readFileSync, writeFileSync } from 'node:fs'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { limpaPagina } from '../src/core/preprocesso'

const [arquivo, saida] = process.argv.slice(2)
const biblioteca = await PDFiumLibrary.init()
const pdf = await biblioteca.loadDocument(readFileSync(arquivo))
const worker = await createWorker('por', OEM.LSTM_ONLY, { langPath: 'public/tessdata', gzip: true, cachePath: '/tmp' })
await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.SINGLE_BLOCK })

const paginas = []
for (const pagina of pdf.pages()) {
  const img = await pagina.render({ scale: 200 / 72, render: 'bitmap', colorSpace: 'RGBA' })
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  const pixels = ctx.createImageData(img.width, img.height)
  pixels.data.set(img.data)
  limpaPagina(pixels as never)
  ctx.putImageData(pixels, 0, 0)
  const { data } = await worker.recognize(canvas.toBuffer('image/png'))
  paginas.push(data.lines.map((l) => ({ texto: l.text.replace(/\n$/, ''), confianca: Math.round(l.confidence) })))
  pagina.close()
}
await worker.terminate()
pdf.destroy()
biblioteca.destroy()
writeFileSync(saida, JSON.stringify(paginas))
console.log('linhas por página:', paginas.map((p) => p.length).join(','))
