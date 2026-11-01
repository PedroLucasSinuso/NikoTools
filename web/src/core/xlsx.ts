/** Gera o .xlsx no mesmo visual da planilha de referência. */
import ExcelJS from 'exceljs'
import type { Config } from './settings'
import type { Relatorio } from './types'
import { NUMERICOS, valor } from './valores'



const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const LARGURAS: Record<string, number> = { produto: 12, descricao: 52, un: 8, quant: 12, minimo: 12, max: 10, ean: 20, saldo: 12 }
const FINA = { style: 'thin', color: { argb: 'FFB7B7B7' } } as const
const BORDA = { left: FINA, right: FINA, top: FINA, bottom: FINA }
const preenche = (argb: string) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } }) as const

export async function geraXlsx(rel: Relatorio, cfg: Config): Promise<Blob> {
  const colunas = cfg.colunas.filter((c) => c.ativa)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(cfg.nomeAba.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'ESTOQUE', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  })
  const formato = cfg.casasDecimais === 0 ? '0' : '0.' + '0'.repeat(cfg.casasDecimais)

  ws.columns = colunas.map((c) => ({ width: Math.max(LARGURAS[c.campo], c.titulo.length + 4) }))
  const cab = ws.addRow(colunas.map((c) => c.titulo))
  cab.height = 24
  cab.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FF1F1F1F' } }
    c.fill = preenche('FFD9EAF7')
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = { ...BORDA, bottom: { style: 'medium', color: { argb: 'FF666666' } } }
  })

  for (const l of rel.linhas) {
    if (l.tipo !== 'produto' && !cfg.incluirTotais) continue
    const linha = ws.addRow(colunas.map((c) => valor(l, c.campo)))
    linha.eachCell({ includeEmpty: true }, (cel, n) => {
      const campo = colunas[n - 1].campo
      cel.border = BORDA
      if (l.tipo === 'produto') {
        cel.font = { name: 'Calibri', size: 11 }
        if (l.conferir) cel.fill = preenche('FFFFF2CC') // amarelo: conferir
      } else {
        cel.font = { bold: l.tipo !== 'sub', color: { argb: 'FF333333' } }
        cel.fill = preenche(l.conferir ? 'FFF4CCCC' : l.tipo === 'sub' ? 'FFE7E6E6' : 'FFD9EAD3')
      }
      if (NUMERICOS.includes(campo)) cel.numFmt = formato
      else if (campo === 'ean') cel.numFmt = '@' // EAN é texto: o Excel não pode virar 8,41E+12
      if (campo !== 'descricao') cel.alignment = { horizontal: 'center' }
    })
  }
  if (ws.rowCount > 1) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: ws.rowCount, column: colunas.length } }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: XLSX_MIME })
}
