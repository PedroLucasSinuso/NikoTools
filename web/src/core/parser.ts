/**
 * Transforma as linhas de texto do OCR nas linhas do relatório de saldos de estoque do FDC e confere
 * as somas contra os totais impressos no próprio relatório. Não depende de navegador: testável em Node.
 */
import type { Aviso, Linha, LinhaOCR, Relatorio } from './types'

/** Abaixo disso (0–100) a linha é marcada pra conferir. */
export const CONFIANCA_MINIMA = 75

const NUM = String.raw`-?[\dOol]+[.,][\dOo]{2,3}`
const RE_PRODUTO = new RegExp(
  String.raw`^(?<cod>\d{1,7})(?<inativo>\*)?\s*(?<desc>.+?)\s+(?<un>[A-Za-z]{1,3})` +
    String.raw`\s+(?<q>${NUM})\s+(?<mi>${NUM})\s+(?<mx>${NUM})` +
    String.raw`(?:\s*(?<ean>[\dOo]{8,14}))?[^\d]*$`,
)
const RE_TOTAL_SUB = /^total\s*sub\W*se\w*\s*:?\s*(\d+)\s+(-?[\dOol.,]+)\s*$/
const RE_TOTAL_SECAO = /^total\s*se\w*\s*:?\s*(\d+)\s+(-?[\dOol.,]+)\s*$/
const RE_TOTAL_GERAL = /^total\s*geral\s*:?\s*(-?[\dOol.,]+)\s*$/
const RE_SUBSECAO = /^sub\s*se\w*\s*:\s*(.+)$/
const RE_SECAO = /^se\w*\s*:\s*(.+)$/

function normaliza(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function numero(s: string): number | null {
  let t = s.replace(/[Oo]/g, '0').replace(/[lI]/g, '1').trim()
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(',', '.')
  const n = Number(t)
  return t !== '' && Number.isFinite(n) ? n : null
}

/** "75O ML" -> "750 ML": o OCR confunde O e 0 colado em dígitos. */
function limpaDescricao(s: string): string {
  return s.replace(/\s+/g, ' ').trim().replace(/(?<=\d)O(?=\d|\s|ML\b|L\b|$)/g, '0')
}

function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000)
}

const vazia = (tipo: Linha['tipo']): Linha => ({
  tipo, produto: '', descricao: '', un: '', quant: null, minimo: null, max: null, ean: '', conferir: false, nota: '',
})

export function interpreta(paginas: LinhaOCR[][]): Relatorio {
  const rel: Relatorio = { linhas: [], avisos: [], loja: '', fornecedor: '', data: '' }
  let secao = ''
  let sub = ''
  let grupo: number[] = [] // quantidades desde o último "Total Sub. Seção"
  let somaSecao = 0, somaGeral = 0
  let erroNaSecao = false

  const aviso = (gravidade: Aviso['gravidade'], texto: string) => rel.avisos.push({ gravidade, texto })

  /** Compara o total impresso com a soma lida. Devolve true se está tudo certo. */
  const confere = (rotulo: string, esperado: number | null, lido: number): boolean => {
    if (esperado === null) {
      aviso('atencao', `${rotulo}: não consegui ler o total do relatório.`)
      return false
    }
    if (Math.abs(esperado - lido) > 0.005) {
      const dif = lido - esperado
      aviso(
        'erro',
        `${rotulo}: o relatório diz ${fmt(esperado)}, mas a soma dos produtos lidos deu ${fmt(lido)} ` +
          `(diferença ${dif > 0 ? '+' : ''}${fmt(dif)}). Algum produto pode ter sido lido errado ou ficado de fora.`,
      )
      return false
    }
    return true
  }

  paginas.forEach((pagina, i) => {
    for (const bruta of pagina) {
      // tira lixo de borda ("| 11645 ...") e normaliza espaços
      const texto = bruta.texto.replace(/^[^\p{L}\p{N}*]+/u, '').replace(/\s+/g, ' ').trim()
      const t = normaliza(texto)
      if (!t) continue

      let m: RegExpMatchArray | null
      if ((m = t.match(/(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/)) && /^\W*da\w*\W/.test(t)) {
        rel.data ||= m[1]
        continue
      }
      if (t.startsWith('pagina') || t.startsWith('*') || t.includes('produtos inativos')) continue
      if (t.startsWith('produto') && t.includes('saldo')) continue
      if (!rel.loja && !rel.linhas.length && /^\d+\s*-\s*\p{L}/u.test(texto) && !RE_PRODUTO.test(texto)) {
        rel.loja = texto
        continue
      }
      if (t.includes('relatorio de saldos')) {
        rel.fornecedor ||= texto.match(/\(\s*\d+\s*-\s*(.+?)\)?\s*$/)?.[1].trim() ?? ''
        continue
      }

      if ((m = t.match(RE_TOTAL_SUB))) {
        const lido = numero(m[2])
        // Se o OCR deixou passar o total de uma subseção anterior, as quantidades dessa subseção ainda estão no
        // grupo: aceita se alguma "cauda" do grupo fecha com o total (a soma da seção ainda confere tudo).
        let lidoNoGrupo = grupo.reduce((a, b) => a + b, 0)
        for (let k = 0, acc = 0; lido !== null && k <= grupo.length; k++) {
          if (k > 0) acc += grupo[grupo.length - k]
          if (Math.abs(acc - lido) <= 0.005 && (k > 0 || lido === 0)) { lidoNoGrupo = acc; break }
        }
        const ok = confere(`Total da subseção ${sub || m[1]}`, lido, lidoNoGrupo)
        rel.linhas.push({ ...vazia('sub'), descricao: `Total Sub. Seção: ${m[1]}`, quant: lido, conferir: !ok, nota: ok ? '' : 'soma não bate' })
        if (!ok) erroNaSecao = true
        grupo = []
        continue
      }
      if ((m = t.match(RE_TOTAL_SECAO))) {
        const lido = numero(m[2])
        // se já avisamos de uma subseção, não repete o mesmo problema na seção
        const ok = erroNaSecao || confere(`Total da seção ${secao || m[1]}`, lido, somaSecao)
        rel.linhas.push({ ...vazia('secao'), descricao: `Total Seção: ${m[1]}`, quant: lido, conferir: !ok, nota: ok ? '' : 'soma não bate' })
        somaSecao = 0
        erroNaSecao = false
        continue
      }
      if ((m = t.match(RE_TOTAL_GERAL))) {
        const lido = numero(m[1])
        const ok = rel.avisos.some((a) => a.gravidade === 'erro') || confere('Total geral', lido, somaGeral)
        rel.linhas.push({ ...vazia('geral'), descricao: 'Total Geral', quant: lido, conferir: !ok, nota: ok ? '' : 'soma não bate' })
        continue
      }
      if ((m = t.match(RE_SUBSECAO))) {
        sub = texto.split(':').slice(1).join(':').trim()
        continue
      }
      if ((m = t.match(RE_SECAO))) {
        secao = texto.split(':').slice(1).join(':').trim()
        continue
      }

      if ((m = texto.match(RE_PRODUTO)) && m.groups) {
        const g = m.groups
        const q = numero(g.q)
        const ean = (g.ean ?? '').replace(/[Oo]/g, '0')
        const descricao = limpaDescricao(g.desc) + (g.inativo ? ' *' : '')
        const notas: string[] = []
        if (bruta.confianca < CONFIANCA_MINIMA) notas.push('leitura com baixa confiança')
        if (ean && ![8, 12, 13, 14].includes(ean.length)) notas.push(`EAN com ${ean.length} dígitos`)
        if (q === null) notas.push('quantidade ilegível')
        const prod: Linha = {
          ...vazia('produto'), produto: g.cod, descricao, un: g.un.toUpperCase(), quant: q,
          minimo: numero(g.mi), max: numero(g.mx), ean, conferir: notas.length > 0, nota: notas.join('; '),
        }
        rel.linhas.push(prod)
        if (notas.length) aviso('atencao', `Produto ${prod.produto} (${descricao}): ${prod.nota}.`)
        grupo.push(q ?? 0)
        somaSecao += q ?? 0
        somaGeral += q ?? 0
        continue
      }

      // Parece produto (começa com código e tem números) mas não separou: não some, fica marcado.
      if (/^\d{3,}/.test(t) && /\d[.,]\d{2}/.test(t)) {
        rel.linhas.push({ ...vazia('produto'), produto: texto.split(' ')[0], descricao: texto, conferir: true, nota: 'linha não reconhecida' })
        aviso('erro', `Página ${i + 1}: não consegui separar as colunas desta linha: "${texto}".`)
        erroNaSecao = true
      }
    }
  })
  return rel
}

export const produtos = (rel: Relatorio): Linha[] => rel.linhas.filter((l) => l.tipo === 'produto')
