import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import fixture from './fixtures/estoque.json'
import { interpreta } from '../src/core/parser'
import { PADRAO } from '../src/core/settings'
import { geraXlsx } from '../src/core/xlsx'
import { nomeDoArquivo } from '../src/core/xlsx-nome'
import { linkWhatsApp, normalizaNumero } from '../src/core/whatsapp'

const rel = () => interpreta(structuredClone(fixture))

async function abre(cfg = PADRAO) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await (await geraXlsx(rel(), cfg)).arrayBuffer())
  return wb.worksheets[0]
}

describe('planilha', () => {
  it('segue o padrão: sem UN, Max vira Físico, Saldo vira Pedido (em branco)', async () => {
    const ws = await abre()
    expect(ws.name).toBe('ESTOQUE')
    expect(ws.getRow(1).values).toEqual([undefined, 'Produto', 'Descrição do Produto', 'Quant', 'Mínimo', 'Físico', 'EAN', 'Pedido'])
    expect(ws.rowCount).toBe(53) // cabeçalho + 40 produtos + totais
    expect(ws.getRow(2).getCell(1).value).toBe(11645)
    expect(ws.getRow(2).getCell(6).value).toBe('8410036810115') // EAN como texto
    expect(ws.getRow(2).getCell(7).value).toBeNull()
    expect(ws.getRow(53).getCell(3).value).toBe(863)
  })

  it('respeita colunas, ordem e totais configurados', async () => {
    const colunas = [...PADRAO.colunas].reverse().map((c) => ({ ...c, ativa: c.campo === 'quant' || c.campo === 'produto' }))
    const ws = await abre({ ...PADRAO, colunas, incluirTotais: false })
    expect(ws.getRow(1).values).toEqual([undefined, 'Quant', 'Produto'])
    expect(ws.rowCount).toBe(41)
  })
})

describe('utilidades', () => {
  it('nome do arquivo', () => expect(nomeDoArquivo('estoque.pdf')).toBe('estoque.xlsx'))
  it('número do WhatsApp', () => {
    expect(normalizaNumero('(11) 99999-8888')).toBe('5511999998888')
    expect(normalizaNumero('+55 11 99999-8888')).toBe('5511999998888')
    expect(linkWhatsApp('', 'oi')).toBe('https://wa.me/?text=oi')
  })
})
