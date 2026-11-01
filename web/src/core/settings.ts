import type { Campo } from './types'

export interface ColunaCfg {
  campo: Campo
  titulo: string
  ativa: boolean
}

export interface Config {
  /** Como cumprimentar na tela inicial (opcional) */
  nome: string
  colunas: ColunaCfg[]
  incluirTotais: boolean
  casasDecimais: 0 | 1 | 2
  nomeAba: string
  /** Só dígitos, com DDI (ex.: 5511999998888). Vazio = escolher o contato na hora. */
  whatsappNumero: string
  whatsappMensagem: string
}

export const PADRAO: Config = {
  nome: '',
  colunas: [
    { campo: 'produto', titulo: 'Produto', ativa: true },
    { campo: 'descricao', titulo: 'Descrição do Produto', ativa: true },
    { campo: 'un', titulo: 'UN', ativa: false },
    { campo: 'quant', titulo: 'Quant', ativa: true },
    { campo: 'minimo', titulo: 'Mínimo', ativa: true },
    { campo: 'max', titulo: 'Físico', ativa: true },
    { campo: 'ean', titulo: 'EAN', ativa: true },
    { campo: 'saldo', titulo: 'Pedido', ativa: true },
  ],
  incluirTotais: true,
  casasDecimais: 2,
  nomeAba: 'ESTOQUE',
  whatsappNumero: '',
  whatsappMensagem: 'Estoque {fornecedor} - {data}',
}

const CHAVE = 'estoque-facil:config:v1'

/** Lê do navegador, completando o que faltar com o padrão (config antiga nunca quebra o app). */
export function carrega(): Config {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Partial<Config> | null
    if (!salvo) return structuredClone(PADRAO)
    const colunas = PADRAO.colunas.map((p) => ({ ...p, ...salvo.colunas?.find((c) => c.campo === p.campo) }))
    // mantém a ordem escolhida
    const ordem = (salvo.colunas ?? []).map((c) => c.campo)
    colunas.sort((a, b) => (ordem.indexOf(a.campo) + 1 || 99) - (ordem.indexOf(b.campo) + 1 || 99))
    return { ...structuredClone(PADRAO), ...salvo, colunas }
  } catch {
    return structuredClone(PADRAO)
  }
}

export function salva(cfg: Config): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(cfg))
  } catch {
    /* navegação privada / armazenamento bloqueado: segue sem salvar */
  }
}
