/** PDF -> imagem (pdf.js) -> texto (Tesseract, português). Tudo roda no navegador, nada é enviado. */
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { limpaPagina } from './preprocesso'
import type { LinhaOCR } from './types'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** 200 dpi: abaixo disso o Tesseract erra bastante nesta fonte fina. */
const DPI = 200

export interface Progresso {
  etapa: 'preparando' | 'lendo'
  pagina: number
  total: number
  /** 0–1, do trabalho todo */
  fracao: number
}

const absoluto = (caminho: string) => new URL(import.meta.env.BASE_URL + caminho, document.baseURI).href

export async function lePdf(arquivo: File, onProgresso: (p: Progresso) => void): Promise<LinhaOCR[][]> {
  onProgresso({ etapa: 'preparando', pagina: 0, total: 0, fracao: 0 })
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  let pdf: pdfjs.PDFDocumentProxy
  try {
    pdf = await tarefa.promise
  } catch (e) {
    if ((e as { name?: string }).name === 'PasswordException') throw new Error('Este PDF tem senha.')
    throw new Error('Não consegui abrir este arquivo como PDF.')
  }

  let paginaAtual = 0
  const worker = await createWorker('por', OEM.LSTM_ONLY, {
    workerPath: absoluto('tesseract/worker.min.js'),
    corePath: absoluto('tesseract'),
    langPath: absoluto('tessdata'),
    gzip: true,
    logger: (m) => {
      if (m.status === 'recognizing text')
        onProgresso({ etapa: 'lendo', pagina: paginaAtual, total: pdf.numPages, fracao: (paginaAtual - 1 + m.progress) / pdf.numPages })
    },
  })
  try {
    // bloco único: o modo automático divide a página em colunas e separa o código do resto da linha
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
    const paginas: LinhaOCR[][] = []
    for (let n = 1; n <= pdf.numPages; n++) {
      paginaAtual = n
      onProgresso({ etapa: 'lendo', pagina: n, total: pdf.numPages, fracao: (n - 1) / pdf.numPages })
      const pagina = await pdf.getPage(n)
      const viewport = pagina.getViewport({ scale: DPI / 72 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await pagina.render({ canvas, viewport }).promise
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      limpaPagina(pixels)
      ctx.putImageData(pixels, 0, 0)
      const { data } = await worker.recognize(canvas)
      paginas.push(data.lines.map((l) => ({ texto: l.text, confianca: l.confidence })))
      canvas.width = canvas.height = 0 // libera memória
    }
    onProgresso({ etapa: 'lendo', pagina: pdf.numPages, total: pdf.numPages, fracao: 1 })
    return paginas
  } finally {
    await worker.terminate()
    await tarefa.destroy()
  }
}
