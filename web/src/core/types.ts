/** Uma linha de texto reconhecida pelo OCR, com a confiança (0–100) que o Tesseract deu a ela. */
export interface LinhaOCR {
  texto: string
  confianca: number
}

export type Campo = 'produto' | 'descricao' | 'un' | 'quant' | 'minimo' | 'max' | 'ean' | 'saldo'
export type TipoLinha = 'produto' | 'sub' | 'secao' | 'geral'

export interface Linha {
  tipo: TipoLinha
  produto: string
  descricao: string
  un: string
  quant: number | null
  minimo: number | null
  max: number | null
  ean: string
  /** linha que a pessoa precisa conferir antes de enviar */
  conferir: boolean
  nota: string
}

export interface Aviso {
  /** "erro": soma não bate ou linha ilegível. "atencao": leitura duvidosa. */
  gravidade: 'erro' | 'atencao'
  texto: string
}

export interface Relatorio {
  linhas: Linha[]
  avisos: Aviso[]
  loja: string
  fornecedor: string
  data: string
}
