/**
 * Transforma as linhas de texto do OCR nas linhas do relatório de saldos de estoque do FDC e confere
 * as somas contra os totais impressos no próprio relatório. Não depende de navegador: testável em Node.
 */
import type { Aviso, Linha, LinhaOCR, Relatorio } from './types'

/** Abaixo disso (0–100) a linha é marcada pra conferir. */
export const CONFIANCA_MINIMA = 75

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

/** Corrige confusões comuns do OCR: "75O ML" -> "750 ML", "SOML" -> "50ML". */
function limpaDescricao(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?<=\d)O(?=\d|\s|ML\b|L\b|$)/g, '0')
    .replace(/(?<=\s)[S5]OML\b/g, '50ML')
}

const DIGITOS_OCR: Record<string, string> = { O: '0', o: '0', D: '0', Q: '0', l: '1', I: '1', S: '5', B: '8', Z: '2' }

/**
 * Lê o EAN que sobra no fim da linha. Produtos sem código de barras saem com o código interno
 * preenchido com zeros (0000000003614), que o OCR costuma embaralhar ("0000000NO03614"): como o fim
 * bate com o código do produto, reconstruímos. Devolve duvida=true se sobrou letra sem explicação.
 */
function leEan(resto: string, cod: string): { ean: string; duvida: boolean } {
  const tok = resto.split(/\s+/).map((t) => t.replace(/[^0-9A-Za-z]/g, '')).filter((t) => t.length >= 3).join('')
  if (tok.length < 6) return { ean: '', duvida: false }
  if (tok.endsWith(cod)) {
    const prefixo = tok.slice(0, tok.length - cod.length)
    const zeros = [...prefixo].filter((c) => c === '0' || c === 'O' || c === 'o').length
    if (prefixo.length >= 3 && zeros * 2 >= prefixo.length) return { ean: cod.padStart(13, '0'), duvida: false }
  }
  const ean = [...tok].map((c) => DIGITOS_OCR[c] ?? c).join('')
  return /^\d+$/.test(ean) ? { ean, duvida: false } : { ean: ean.replace(/\D/g, ''), duvida: true }
}

const DATA = /^\d{2}\/\d{2}\/\d{4}$/
const DECIMAL = /^-?[\dOol]+[.,][\dOo]{1,4}$/
/** Token que cabe na zona numérica da linha: números, datas e um "o" solto (zero que o OCR leu como letra). */
const NUMERICO = /^(?:-?[\dOol.,/]+|[Oo])$/
/** Parece pedaço de código de barras: maioria de dígitos (o OCR troca 0 por O, N, C...). */
const pareceEan = (t: string) => t.length >= 3 && (t.match(/[\dOo]/g)?.length ?? 0) / t.length >= 0.6

/**
 * Quantas colunas existem depois de "Quant" (Mínimo, Max e o que mais o relatório tiver, como "Q. CX"),
 * lendo o cabeçalho impresso em cada página. Assim o mesmo código serve pra qualquer variação do relatório.
 */
function colunasDepoisDeQuant(cabecalho: string): number {
  const depois = cabecalho.slice(cabecalho.indexOf('quant') + 5)
  const fim = depois.search(/\bean\b|saldo/)
  const trecho = fim >= 0 ? depois.slice(0, fim) : depois
  // cada palavra do cabeçalho entre "Quant" e "EAN" é uma coluna; o OCR pode errar a grafia ("Q.X"), mas não a contagem
  const colunas = trecho.split(/\s+/).filter((w) => w.replace(/[^a-z0-9]/g, '').length >= 2)
  return Math.max(2, colunas.length)
}

interface ProdutoLido {
  cod: string
  inativo: boolean
  descricao: string
  un: string
  q: string | null
  mi: string | null
  mx: string | null
  eanBruto: string
}

/**
 * Lê uma linha de produto sem depender do número de colunas: o código fica na ponta esquerda, o EAN na
 * direita, e as colunas numéricas são contadas da direita pra esquerda (Max, Mínimo, ...), de modo que
 * uma coluna a mais no começo (datas, Ult-Ent) ou um valor que o OCR perdeu não desalinha o resto.
 */
function leProduto(texto: string, depoisDeQuant: number | null): ProdutoLido | null {
  const m = texto.match(/^(\d{1,7})(?!\d)(\*)?\s*(.*)$/)
  if (!m) return null
  // "6.0007/10/2025" -> "6.00 07/10/2025": número colado na data
  const toks = m[3].replace(/(\d[.,]\d{2})(?=\d{2}\/\d{2}\/\d{4})/g, '$1 ').split(/\s+/).filter(Boolean)
  let fim = toks.length

  // lixo curto no fim da linha (o sublinhado do campo "Saldo" vira "o", "—", "|")
  while (fim > 0 && !/\d/.test(toks[fim - 1]) && toks[fim - 1].replace(/[^0-9A-Za-z]/g, '').length < 3) fim--
  // EAN: até 2 pedaços finais que parecem código (o OCR às vezes parte no meio)
  const ean: string[] = []
  while (fim > 0 && ean.length < 2) {
    const t = toks[fim - 1]
    const limpo = t.replace(/[^0-9A-Za-z]/g, '')
    if (DECIMAL.test(t) || DATA.test(t) || !pareceEan(limpo)) break
    ean.unshift(limpo)
    fim--
  }
  if (ean.join('').length < 6) {
    fim += ean.length // pedaço curto demais pra ser EAN: devolve pra linha
    ean.length = 0
  }
  // zona numérica: tudo que for número/data logo antes do EAN
  let ini = fim
  while (ini > 0 && NUMERICO.test(toks[ini - 1])) ini--
  const cauda = toks.slice(ini, fim)
  const valores = cauda.filter((t) => !DATA.test(t))
  if (valores.length < 2 || !valores.some((t) => DECIMAL.test(t))) return null

  const depois = depoisDeQuant ?? (cauda.some((t) => DATA.test(t)) ? 3 : 2)
  const mx = valores.at(-1) ?? null
  const mi = valores.at(-2) ?? null
  const q = valores.length > depois ? valores[valores.length - 1 - depois] : null

  // unidade: o token logo antes da zona numérica, se for curto ("UN", "CX", "LT")
  const antes = toks.slice(0, ini)
  const un = antes.length > 1 && antes.at(-1)!.length <= 3 ? antes.pop()! : 'UN'
  return { cod: m[1], inativo: !!m[2], descricao: antes.join(' '), un, q, mi, mx, eanBruto: ean.join(' ') }
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
  let ultimo: Linha | null = null // produto que pode receber linhas de continuação da descrição
  let continuacoes = 0
  let depoisDeQuant: number | null = null // colunas após "Quant", conforme o cabeçalho da página

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
    ultimo = null
    for (const bruta of pagina) {
      // tira lixo de borda ("| 11645 ...") e normaliza espaços
      const texto = bruta.texto.replace(/^[^\p{L}\p{N}*]+/u, '').replace(/[\s|_]+$/u, '').replace(/\s+/g, ' ').trim()
      const t = normaliza(texto)
      if (!t) continue

      let m: RegExpMatchArray | null
      if ((m = t.match(/(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/)) && /^\W*da\w*\W/.test(t)) {
        rel.data ||= m[1]
        continue
      }
      if (t.startsWith('pagina') || t.startsWith('*') || t.includes('produtos inativos')) continue
      if (t.includes('quant') && (t.includes('minimo') || /\bmax\b/.test(t))) {
        depoisDeQuant = colunasDepoisDeQuant(t)
        continue
      }
      if (t.includes('saldo') && t.includes('minimo')) continue
      if (/^[\d\s,)]+$/.test(t) && (t.match(/,/g)?.length ?? 0) >= 5) continue // lista de códigos do filtro
      if (!rel.loja && !rel.linhas.length && /^\d+\s*-\s*\p{L}/u.test(texto) && !leProduto(texto, null)) {
        rel.loja = texto
        continue
      }
      if (t.includes('relatorio de saldos')) {
        rel.fornecedor ||= texto.match(/\(\s*\d+\s*-\s*(.+?)\)?\s*$/)?.[1].trim() ?? ''
        continue
      }

      if (/^(total|sub\s*se|se\w*\s*:)/.test(t)) ultimo = null
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

      const lido = leProduto(texto, depoisDeQuant)
      if (lido) {
        const g = lido
        const q = g.q === null ? null : numero(g.q)
        const { ean, duvida } = leEan(g.eanBruto, g.cod)
        const descricao = limpaDescricao(g.descricao) + (g.inativo ? ' *' : '')
        const notas: string[] = []
        if (bruta.confianca < CONFIANCA_MINIMA) notas.push('leitura com baixa confiança')
        if (duvida) notas.push('EAN duvidoso')
        else if (ean && ![8, 12, 13, 14].includes(ean.length)) notas.push(`EAN com ${ean.length} dígitos`)
        if (q === null) notas.push('quantidade ilegível')
        const prod: Linha = {
          ...vazia('produto'), produto: g.cod, descricao, un: /^[A-Za-z]{1,3}$/.test(g.un) ? g.un.toUpperCase() : 'UN', quant: q,
          minimo: g.mi === null ? null : numero(g.mi), max: g.mx === null ? null : numero(g.mx), ean, conferir: notas.length > 0, nota: notas.join('; '),
        }
        rel.linhas.push(prod)
        ultimo = prod
        continuacoes = 0
        if (notas.length) aviso('atencao', `Produto ${prod.produto} (${descricao}): ${prod.nota}.`)
        grupo.push(q ?? 0)
        somaSecao += q ?? 0
        somaGeral += q ?? 0
        continue
      }

      // Descrição que quebrou em mais de uma linha: texto sem números, logo abaixo do produto.
      if (ultimo && continuacoes < 3 && bruta.confianca >= 60 && /\p{L}{3}/u.test(texto) && !/\d[.,]\d{2}/.test(texto)) {
        ultimo.descricao = limpaDescricao(`${ultimo.descricao} ${texto}`)
        continuacoes++
        continue
      }

      // Parece produto (começa com código e tem números) mas não separou: não some, fica marcado.
      if (/^\d{3,}/.test(t) && /\d[.,]\d{2}/.test(t)) {
        rel.linhas.push({ ...vazia('produto'), produto: texto.split(' ')[0], descricao: texto, conferir: true, nota: 'linha não reconhecida' })
        aviso('atencao', `Página ${i + 1}: não consegui ler esta linha direito: "${texto}".`)
      }
    }
  })
  return rel
}

export const produtos = (rel: Relatorio): Linha[] => rel.linhas.filter((l) => l.tipo === 'produto')
