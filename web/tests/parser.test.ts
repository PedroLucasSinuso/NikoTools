import { describe, expect, it } from 'vitest'
import fixture from './fixtures/estoque.json'
import fixtureGrande from './fixtures/estoque-grande.json'
import fixtureWhisky from './fixtures/estoque-whisky.json'
import { interpreta, produtos } from '../src/core/parser'
import type { LinhaOCR } from '../src/core/types'

const paginas = (): LinhaOCR[][] => structuredClone(fixture) as LinhaOCR[][]

describe('relatório de exemplo (OCR real do Tesseract)', () => {
  it('lê os 40 produtos e as somas batem', () => {
    const rel = interpreta(paginas())
    expect(rel.avisos).toEqual([])
    const ps = produtos(rel)
    expect(ps).toHaveLength(40)
    expect(ps.reduce((s, p) => s + (p.quant ?? 0), 0)).toBe(863)
    const geral = rel.linhas.at(-1)!
    expect(geral.tipo).toBe('geral')
    expect(geral.quant).toBe(863)
  })

  it('lê os campos de uma linha com vírgula no lugar do ponto', () => {
    const ps = produtos(interpreta(paginas()))
    const p = ps.find((x) => x.produto === '3722')!
    expect(p).toMatchObject({ descricao: 'VINHO JULIA FLORISTA TINTO MEIO SECO 750 ML', quant: 15, minimo: 44, max: 0 })
    expect(ps.find((x) => x.produto === '11463')!.ean).toBe('5660199630005')
  })

  it('pega fornecedor e data do cabeçalho', () => {
    const rel = interpreta(paginas())
    expect(rel.fornecedor).toContain('EXEMPLO')
    expect(rel.data).toBe('30/10/2026 12:59:46')
    expect(rel.loja).toBe('01 - LOJA')
  })

  it('avisa quando uma quantidade é lida errada', () => {
    const p = paginas()
    p[0] = p[0].map((l) => ({ ...l, texto: l.texto.replace('59.00', '5.00') }))
    const rel = interpreta(p)
    expect(rel.avisos.some((a) => a.gravidade === 'erro' && a.texto.includes('subseção'))).toBe(true)
    expect(rel.linhas.some((l) => l.tipo === 'sub' && l.conferir)).toBe(true)
  })

  it('não perde linha que não consegue separar: marca pra conferir', () => {
    const p = paginas()
    p[0] = p[0].map((l) => ({ ...l, texto: l.texto.replace('59.00', '59,0,0') }))
    const rel = interpreta(p)
    expect(rel.linhas.some((l) => l.conferir && l.nota === 'linha não reconhecida')).toBe(true)
    expect(rel.avisos.some((a) => a.gravidade === 'erro')).toBe(true)
  })

  it('avisa leitura de baixa confiança sem derrubar a soma', () => {
    const p = paginas()
    p[0].find((l) => l.texto.startsWith('11645'))!.confianca = 40
    const rel = interpreta(p)
    expect(rel.avisos).toHaveLength(1)
    expect(rel.avisos[0].gravidade).toBe('atencao')
  })
})

describe('robustez', () => {
  it('não dá alarme falso se o OCR perdeu o total de uma subseção', () => {
    const p = paginas()
    p[0] = p[0].filter((l) => !/Total Sub\. Seção: 36/.test(l.texto))
    expect(interpreta(p).avisos).toEqual([])
  })

  it('ainda pega erro de quantidade mesmo sem o total de outra subseção', () => {
    const p = paginas()
    p[0] = p[0].filter((l) => !/Total Sub\. Seção: 36/.test(l.texto)).map((l) => ({ ...l, texto: l.texto.replace('21.000', '21.000').replace(' 6.00 ', ' 8.00 ') }))
    expect(interpreta(p).avisos.some((a) => a.gravidade === 'erro')).toBe(true)
  })
})

describe('relatório grande (15 páginas, 484 produtos)', () => {
  const grande = () => interpreta(structuredClone(fixtureGrande) as LinhaOCR[][])

  it('lê tudo e todos os totais conferem', () => {
    const rel = grande()
    expect(rel.avisos.filter((a) => a.gravidade === 'erro')).toEqual([])
    expect(produtos(rel)).toHaveLength(484)
    const geral = rel.linhas.at(-1)!
    expect(geral.tipo).toBe('geral')
    expect(geral.quant).toBe(produtos(rel).reduce((s, p) => s + (p.quant ?? 0), 0))
  })

  it('reconstrói o EAN interno (zeros + código) quando o OCR embaralha', () => {
    const ps = produtos(grande())
    const p = ps.find((x) => x.produto === '3614')!
    expect(p.ean).toBe('0000000003614')
    expect(ps.find((x) => x.produto === '198')!.ean).toBe('0000000000198')
    expect(ps.every((x) => x.ean === '' || /^\d+$/.test(x.ean))).toBe(true)
  })

  it('corrige "SOML" para "50ML" na descrição', () => {
    expect(produtos(grande()).some((p) => /\bSOML\b/.test(p.descricao))).toBe(false)
  })
})

describe('variante com Ult-Ent, data e Q. CX (descrição em várias linhas)', () => {
  const rel = () => interpreta(structuredClone(fixtureWhisky) as LinhaOCR[][])

  it('lê as colunas certas e as somas conferem', () => {
    const r = rel()
    expect(r.avisos.filter((a) => a.gravidade === 'erro')).toEqual([])
    const ps = produtos(r)
    expect(ps.length).toBeGreaterThan(70)
    expect(r.linhas.at(-1)!.quant).toBe(ps.reduce((s, p) => s + (p.quant ?? 0), 0))
    const p = ps.find((x) => x.produto === '10585')!
    expect([p.quant, p.minimo, p.max, p.ean]).toEqual([2, 0, 0, '7896053801502'])
    expect(ps.find((x) => x.produto === '10188')!.quant).toBe(23)
  })

  it('junta a descrição que quebrou em outra linha', () => {
    const p = produtos(rel()).find((x) => x.produto === '10585')!
    expect(p.descricao).toBe('WHISKY BUFFALO TRACE 750ML + COPO')
  })

  it('junta o EAN que o OCR partiu por espaço', () => {
    const p = produtos(rel()).find((x) => x.produto === '4097')
    if (p) expect(p.ean).toMatch(/^\d{13}$/)
  })
})

describe('bordas da tabela', () => {
  it('reconhece total de seção com barra no fim da linha', () => {
    const pagina: LinhaOCR[] = [
      { texto: '11173 BISCOITO X UN 6.00 4.00 0.00 8000350007928 o', confianca: 90 },
      { texto: 'Total Sub. Seção: 136 6.000', confianca: 95 },
      { texto: '| Total Seção: 33 6.000 |', confianca: 95 },
      { texto: 'Total Geral: 6.000', confianca: 95 },
    ]
    const r = interpreta([pagina])
    expect(r.avisos).toEqual([])
    expect(r.linhas.map((l) => l.tipo)).toEqual(['produto', 'sub', 'secao', 'geral'])
  })
})
