import type { Campo, Linha } from './types'

/** Valor de uma coluna pra uma linha (usado pela planilha e pela prévia, pra os dois mostrarem o mesmo). */
export function valor(l: Linha, campo: Campo): string | number | null {
  if (l.tipo !== 'produto') return campo === 'descricao' ? l.descricao : campo === 'quant' ? l.quant : null
  switch (campo) {
    case 'produto': return /^\d+$/.test(l.produto) ? Number(l.produto) : l.produto
    case 'descricao': return l.descricao
    case 'un': return l.un || null
    case 'quant': return l.quant
    case 'minimo': return l.minimo
    case 'max': return l.max
    case 'ean': return l.ean || null
    case 'saldo': return null // em branco: coluna a preencher
  }
}

export const NUMERICOS: Campo[] = ['quant', 'minimo', 'max']
