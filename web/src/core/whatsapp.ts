import type { Config } from './settings'
import type { Relatorio } from './types'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface ContextoMensagem {
  loja: string
  fornecedor: string
  data: string
  produtos: number
  total: number | null
}

export const VARIAVEIS: { chave: keyof ContextoMensagem; rotulo: string }[] = [
  { chave: 'fornecedor', rotulo: 'Fornecedor' },
  { chave: 'data', rotulo: 'Data do relatório' },
  { chave: 'loja', rotulo: 'Loja' },
  { chave: 'produtos', rotulo: 'Nº de produtos' },
  { chave: 'total', rotulo: 'Total em estoque' },
]

export const CONTEXTO_EXEMPLO: ContextoMensagem = {
  loja: '01 - LOJA',
  fornecedor: 'DISTRIBUIDORA EXEMPLO LTDA',
  data: '30/10/2026 12:59',
  produtos: 40,
  total: 863,
}

export function contexto(rel: Relatorio): ContextoMensagem {
  const geral = rel.linhas.find((l) => l.tipo === 'geral')
  return {
    loja: rel.loja,
    fornecedor: rel.fornecedor,
    data: rel.data,
    produtos: rel.linhas.filter((l) => l.tipo === 'produto').length,
    total: geral?.quant ?? null,
  }
}

/** Troca {variavel} pelo valor; mantém quebras de linha e tira espaços sobrando. */
export function montaMensagem(modelo: string, ctx: ContextoMensagem): string {
  return modelo
    .replace(/\{(\w+)\}/g, (todo, chave: string) => {
      if (!(chave in ctx)) return todo
      const v = ctx[chave as keyof ContextoMensagem]
      return v === null ? '' : typeof v === 'number' ? v.toLocaleString('pt-BR') : v
    })
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const mensagem = (cfg: Config, rel: Relatorio): string => montaMensagem(cfg.whatsappMensagem, contexto(rel))

/** "(11) 99999-8888" -> "5511999998888" (só dígitos, com o 55 do Brasil se faltar). */
export function normalizaNumero(bruto: string): string {
  const d = bruto.replace(/\D/g, '')
  return d.length === 10 || d.length === 11 ? '55' + d : d
}

export function linkWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${normalizaNumero(numero)}?text=${encodeURIComponent(texto)}`
}

export type ResultadoEnvio = 'compartilhado' | 'cancelado' | 'manual'

/**
 * 1º caminho: folha de compartilhamento do sistema, que anexa a planilha direto no WhatsApp
 *   (iPhone/Safari, Android, Chrome/Edge). 2º: baixa o arquivo e abre a conversa com o texto pronto;
 *   aí é só anexar (o link do WhatsApp não aceita arquivo).
 */
export async function enviar(blob: Blob, nomeArquivo: string, cfg: Config, rel: Relatorio): Promise<ResultadoEnvio> {
  const texto = mensagem(cfg, rel)
  const arquivo = new File([blob], nomeArquivo, { type: XLSX_MIME })
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: texto })
      return 'compartilhado'
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return 'cancelado'
      // qualquer outro erro: cai no plano B
    }
  }
  baixa(blob, nomeArquivo)
  window.open(linkWhatsApp(cfg.whatsappNumero, texto), '_blank', 'noopener')
  return 'manual'
}

export function baixa(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** 5511999998888 -> "+55 (11) 99999-8888"; devolve null se não parece um número completo. */
export function formataNumero(bruto: string): string | null {
  const d = normalizaNumero(bruto)
  const m = d.match(/^(55)(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `+${m[1]} (${m[2]}) ${m[3]}-${m[4]}` : null
}
