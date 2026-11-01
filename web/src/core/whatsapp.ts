import type { Config } from './settings'
import type { Relatorio } from './types'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function mensagem(cfg: Config, rel: Relatorio): string {
  return cfg.whatsappMensagem
    .replace(/\{loja\}/g, rel.loja)
    .replace(/\{fornecedor\}/g, rel.fornecedor)
    .replace(/\{data\}/g, rel.data)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Aceita "(11) 99999-8888", "+55 11 99999-8888"...: só dígitos, e põe o 55 do Brasil se faltar. */
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
