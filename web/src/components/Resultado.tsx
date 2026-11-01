import { useEffect, useMemo, useState } from 'react'
import type { Config } from '../core/settings'
import type { Relatorio } from '../core/types'
import { produtos } from '../core/parser'
import { NUMERICOS, valor } from '../core/valores'
import { nomeDoArquivo } from '../core/xlsx-nome'
import * as zap from '../core/whatsapp'
import { IconeAtencao, IconeBaixar, IconeCerto, IconeZap } from './icones'
import { ui } from './ui'

interface Props {
  arquivoPdf: string
  rel: Relatorio
  cfg: Config
  onOutro: () => void
}

export function Resultado({ arquivoPdf, rel, cfg, onOutro }: Props) {
  const [xlsx, setXlsx] = useState<Blob | null>(null)
  const [aviso, setAviso] = useState('')
  const nome = nomeDoArquivo(arquivoPdf)
  const qtd = produtos(rel).length
  const precisaConferir = rel.avisos.length > 0

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
    <div className="entra grid gap-5">
      <section className={`${ui.cartao} grid gap-5`}>
        <div className="flex items-start gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-full ${precisaConferir ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok'}`}>
            {precisaConferir ? <IconeAtencao /> : <IconeCerto width={28} height={28} />}
          </span>
          <div>
            <h2 className="text-2xl font-bold">{precisaConferir ? 'Quase pronto: confira antes de enviar' : 'Pronto! Sua planilha está certinha'}</h2>
            <p className="mt-1 text-muted">
              {qtd} produtos lidos de <span className="font-medium text-ink">{arquivoPdf}</span>
              {!precisaConferir && '. As somas batem com os totais do relatório.'}
            </p>
          </div>
        </div>

        {precisaConferir && (
          <div className="rounded-2xl border border-warn-line bg-warn-bg p-4 text-warn">
            <p className="font-semibold">As linhas pintadas de amarelo (ou o total em vermelho) merecem uma olhadinha:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {rel.avisos.map((a, i) => <li key={i}>{a.texto}</li>)}
            </ul>
            <p className="mt-2 text-sm">Você pode baixar mesmo assim e corrigir direto no Excel.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className={`${ui.primario} text-lg`} disabled={!xlsx} onClick={() => xlsx && zap.baixa(xlsx, nome)}>
            <IconeBaixar /> Baixar a planilha
          </button>
          <button type="button" className={`${ui.secundario} text-lg`} disabled={!xlsx} onClick={enviar}>
            <IconeZap /> Enviar no WhatsApp
          </button>
        </div>
        {aviso && <p role="status" className="rounded-2xl bg-soft p-4">{aviso}</p>}
      </section>

      <Previa rel={rel} cfg={cfg} />

      <div className="text-center">
        <button type="button" className={ui.discreto} onClick={onOutro}>Converter outro PDF</button>
      </div>
    </div>
  )
}

function Previa({ rel, cfg }: { rel: Relatorio; cfg: Config }) {
  const colunas = cfg.colunas.filter((c) => c.ativa)
  const linhas = useMemo(() => rel.linhas.filter((l) => l.tipo === 'produto' || cfg.incluirTotais), [rel, cfg.incluirTotais])
  const fmt = (n: number) => n.toFixed(cfg.casasDecimais)
  return (
    <details className={`${ui.cartao} group p-0`}>
      <summary className="cursor-pointer list-none rounded-3xl px-6 py-4 font-semibold hover:bg-soft">
        Ver como a planilha ficou <span className="text-muted group-open:hidden">(clique para abrir)</span>
      </summary>
      <div className="max-h-[28rem] overflow-auto border-t border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-soft">
            <tr>
              {colunas.map((c) => <th key={c.campo} className="whitespace-nowrap px-3 py-2 font-semibold">{c.titulo}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr
                key={i}
                className={`border-t border-line ${
                  l.tipo !== 'produto' ? (l.conferir ? 'bg-warn-bg' : 'bg-soft font-semibold') : l.conferir ? 'bg-warn-bg' : ''
                }`}
                title={l.nota || undefined}
              >
                {colunas.map((c) => {
                  const v = valor(l, c.campo)
                  return (
                    <td key={c.campo} className={`px-3 py-1.5 ${NUMERICOS.includes(c.campo) ? 'text-right tabular-nums' : ''}`}>
                      {typeof v === 'number' && NUMERICOS.includes(c.campo) ? fmt(v) : (v ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
