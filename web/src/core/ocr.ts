/** PDF -> imagem (PDFium) -> texto (Tesseract, português). Tudo roda no navegador, nada é enviado. */
import { PDFiumLibrary } from '@hyzyla/pdfium'
import pdfiumWasm from '@hyzyla/pdfium/pdfium.wasm?url'
import { createWorker, OEM, PSM } from 'tesseract.js'
import { limpaPagina } from './preprocesso'
import type { LinhaOCR } from './types'

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

export interface LeituraPdf {
  paginas: LinhaOCR[][]
  /** URLs (blob:) das páginas originais, pra comparar com a planilha. Quem usa deve revogar. */
  imagens: string[]
}

const LARGURA_PREVIA = 1000

function previa(origem: HTMLCanvasElement): Promise<string> {
  const escala = Math.min(1, LARGURA_PREVIA / origem.width)
  const c = document.createElement('canvas')
  c.width = Math.round(origem.width * escala)
  c.height = Math.round(origem.height * escala)
  c.getContext('2d')!.drawImage(origem, 0, 0, c.width, c.height)
  return new Promise((ok, falha) =>
    c.toBlob((b) => (b ? ok(URL.createObjectURL(b)) : falha(new Error('sem prévia'))), 'image/jpeg', 0.85),
  )
}

export async function lePdf(arquivo: File, onProgresso: (p: Progresso) => void): Promise<LeituraPdf> {
  onProgresso({ etapa: 'preparando', pagina: 0, total: 0, fracao: 0 })
  const biblioteca = await PDFiumLibrary.init({ wasmUrl: new URL(pdfiumWasm, document.baseURI).href })
  let pdf: Awaited<ReturnType<typeof biblioteca.loadDocument>>
  try {
    pdf = await biblioteca.loadDocument(new Uint8Array(await arquivo.arrayBuffer()))
  } catch (e) {
    biblioteca.destroy()
    if (/password/i.test(String((e as Error)?.message))) throw new Error('Este PDF tem senha.')
    throw new Error('Não consegui abrir este arquivo como PDF.')
  }
  const total = pdf.getPageCount()

  let paginaAtual = 0
  const worker = await createWorker('por', OEM.LSTM_ONLY, {
    workerPath: absoluto('tesseract/worker.min.js'),
    corePath: absoluto('tesseract'),
    langPath: absoluto('tessdata'),
    gzip: true,
    logger: (m) => {
      if (m.status === 'recognizing text')
        onProgresso({ etapa: 'lendo', pagina: paginaAtual, total, fracao: (paginaAtual - 1 + m.progress) / total })
    },
  })
  try {
    // bloco único: o modo automático divide a página em colunas e separa o código do resto da linha
    await worker.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
    const paginas: LinhaOCR[][] = []
    const imagens: string[] = []
    for (const pagina of pdf.pages()) {
      paginaAtual = pagina.number
      onProgresso({ etapa: 'lendo', pagina: paginaAtual, total, fracao: (paginaAtual - 1) / total })
      const img = await pagina.render({ scale: DPI / 72, render: 'bitmap', colorSpace: 'RGBA' })
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      const pixels = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height)
      ctx.putImageData(pixels, 0, 0)
      imagens.push(await previa(canvas))
      limpaPagina(pixels)
      ctx.putImageData(pixels, 0, 0)
      const { data } = await worker.recognize(canvas)
      paginas.push(data.lines.map((l) => ({ texto: l.text, confianca: l.confidence })))
      canvas.width = canvas.height = 0 // libera memória
      pagina.close()
    }
    onProgresso({ etapa: 'lendo', pagina: total, total, fracao: 1 })
    return { paginas, imagens }
  } finally {
    await worker.terminate()
    pdf.destroy()
    biblioteca.destroy()
  }
}
