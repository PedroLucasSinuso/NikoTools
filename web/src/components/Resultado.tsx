import { CircleCheck, Download, MessageCircle, Pencil, RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Config } from '../core/settings'
import type { Relatorio } from '../core/types'
import { produtos } from '../core/parser'
import { nomeDoArquivo } from '../core/xlsx-nome'
import * as zap from '../core/whatsapp'
import { Comparador } from './Comparador'
import type { Aba } from './Ajustes'
import { ui } from './ui'

interface Props {
  arquivoPdf: string
  rel: Relatorio
  cfg: Config
  imagens: string[]
  onOutro: () => void
  onAjustes: (aba: Aba) => void
}

export function Resultado({ arquivoPdf, rel, cfg, imagens, onOutro, onAjustes }: Props) {
  const [xlsx, setXlsx] = useState<Blob | null>(null)
  const [aviso, setAviso] = useState('')
  const nome = nomeDoArquivo(arquivoPdf)
  const qtd = produtos(rel).length
  const precisaConferir = rel.avisos.length > 0
  const texto = zap.mensagem(cfg, rel)

  // Já deixa a planilha pronta: o compartilhar do celular exige que o toque chame direto (sem esperar).
  useEffect(() => {
    let vivo = true
    import('../core/xlsx').then(({ geraXlsx }) => geraXlsx(rel, cfg)).then((b) => vivo && setXlsx(b))
    return () => { vivo = false }
  }, [rel, cfg])

  async function enviar() {
    if (!xlsx) return
    const r = await zap.enviar(xlsx, nome, cfg, rel)
    setAviso(
      r === 'manual'
        ? 'A planilha foi baixada e o WhatsApp abriu em outra aba. Toque no clipe, escolha "Documento" e anexe o arquivo que acabou de baixar.'
        : r === 'compartilhado' ? 'Enviado! Confira no WhatsApp.' : '',
    )
  }

  return (
    <div className="entra grid gap-6">
      <section className={`${ui.cartao} grid gap-5 p-6`}>
        <div className="flex items-start gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${precisaConferir ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok'}`}>
            {precisaConferir ? <TriangleAlert size={26} /> : <CircleCheck size={26} />}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold">
              {precisaConferir ? 'Quase pronto: confira antes de enviar' : 'Pronto! Sua planilha está certinha'}
            </h2>
            <p className="mt-1 text-muted">
              {qtd} produtos lidos de <span className="font-medium text-ink">{arquivoPdf}</span>
              {!precisaConferir && '. As somas batem com os totais do relatório.'}
            </p>
          </div>
        </div>

        {precisaConferir && (
          <div className="rounded-xl border border-warn-line bg-warn-bg p-4 text-warn">
            <p className="font-semibold">As linhas em amarelo (ou o total em vermelho) merecem uma olhadinha:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {rel.avisos.map((a, i) => <li key={i}>{a.texto}</li>)}
            </ul>
            <p className="mt-2 text-sm">Compare com o PDF logo abaixo. Dá pra baixar mesmo assim e corrigir direto no Excel.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className={`${ui.primario} text-lg`} disabled={!xlsx} onClick={() => xlsx && zap.baixa(xlsx, nome)}>
            <Download size={20} /> Baixar a planilha
          </button>
          <button type="button" className={`${ui.secundario} text-lg`} disabled={!xlsx} onClick={enviar}>
            <MessageCircle size={20} /> Enviar no WhatsApp
          </button>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted">
          <span className="shrink-0 pt-0.5 font-semibold">Mensagem:</span>
          <span className="min-w-0 flex-1 whitespace-pre-line break-words">{texto || '(sem texto)'}</span>
          <button type="button" className="inline-flex shrink-0 cursor-pointer items-center gap-1 font-semibold text-brand hover:underline" onClick={() => onAjustes('whatsapp')}>
            <Pencil size={14} /> Editar
          </button>
        </p>
        {aviso && <p role="status" className="rounded-xl bg-soft p-4">{aviso}</p>}
      </section>

      <Comparador rel={rel} cfg={cfg} imagens={imagens} onAjustes={() => onAjustes('colunas')} />

      <div className="text-center">
        <button type="button" className={ui.discreto} onClick={onOutro}>
          <RotateCcw size={16} /> Converter outro PDF
        </button>
      </div>
    </div>
  )
}
