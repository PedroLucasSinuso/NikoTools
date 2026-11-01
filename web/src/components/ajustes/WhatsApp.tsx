import { CheckCheck, CircleCheck, FileSpreadsheet, Info, Phone, TriangleAlert } from 'lucide-react'
import { Fragment, useRef, type ReactNode } from 'react'
import type { Config } from '../../core/settings'
import { CONTEXTO_EXEMPLO, formataNumero, montaMensagem, normalizaNumero, VARIAVEIS, type ContextoMensagem } from '../../core/whatsapp'
import { ui } from '../ui'
import { Campo } from './Campo'

interface Props {
  cfg: Config
  onMudar: (c: Config) => void
  /** dados do relatório atual; sem relatório, a prévia usa um exemplo */
  ctx: ContextoMensagem | null
  nomeXlsx: string
}

const MODELOS = [
  { nome: 'Simples', texto: 'Estoque {fornecedor} - {data}' },
  { nome: 'Com resumo', texto: 'Oi! Segue o estoque de {data}: {produtos} produtos, {total} unidades.' },
  { nome: 'Em linhas', texto: 'Bom dia!\nSegue o estoque do {fornecedor}.\n\n*{produtos} produtos* · {total} un.' },
]

/** Aplica o negrito (*x*), itálico (_x_) e tachado (~x~) do WhatsApp. */
function formataZap(texto: string): ReactNode[] {
  return texto.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/).map((p, i) => {
    if (p.length > 2 && /^\*.+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>
    if (p.length > 2 && /^_.+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
    if (p.length > 2 && /^~.+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>
    return <Fragment key={i}>{p}</Fragment>
  })
}

export function WhatsApp({ cfg, onMudar, ctx, nomeXlsx }: Props) {
  const area = useRef<HTMLTextAreaElement>(null)
  const set = <K extends keyof Config>(k: K, v: Config[K]) => onMudar({ ...cfg, [k]: v })

  const digitos = normalizaNumero(cfg.whatsappNumero)
  const formatado = formataNumero(cfg.whatsappNumero)
  const real = ctx !== null
  const texto = montaMensagem(cfg.whatsappMensagem, ctx ?? CONTEXTO_EXEMPLO)
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  function inserir(chave: string) {
    const el = area.current
    const ini = el?.selectionStart ?? cfg.whatsappMensagem.length
    const fim = el?.selectionEnd ?? ini
    const v = `${cfg.whatsappMensagem.slice(0, ini)}{${chave}}${cfg.whatsappMensagem.slice(fim)}`
    set('whatsappMensagem', v)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = ini + chave.length + 2
      el?.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
      <div className="grid gap-7">
      <Campo
        id="zap-numero"
        rotulo="Número de quem recebe"
        dica={
          !digitos ? (
            <span className="inline-flex items-center gap-1.5"><Info size={15} /> Sem número, você escolhe o contato na hora de enviar.</span>
          ) : formatado ? (
            <span className="inline-flex items-center gap-1.5 text-ok"><CircleCheck size={15} /> Vai abrir a conversa com {formatado}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-warn"><TriangleAlert size={15} /> Faltam dígitos: use DDD + número, ex.: (11) 99999-8888</span>
          )
        }
      >
        <div className="relative">
          <Phone size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            id="zap-numero" type="tel" inputMode="tel" placeholder="(11) 99999-8888" value={cfg.whatsappNumero}
            onChange={(e) => set('whatsappNumero', e.target.value)} className={`${ui.campo} pl-11`}
          />
        </div>
      </Campo>

      <div className="grid gap-3">
        <Campo id="zap-mensagem" rotulo="Mensagem que acompanha a planilha">
          <textarea
            ref={area} id="zap-mensagem" rows={4} value={cfg.whatsappMensagem}
            onChange={(e) => set('whatsappMensagem', e.target.value)} className={`${ui.campo} resize-y leading-relaxed`}
          />
        </Campo>
        <div className="grid gap-1.5">
          <p className="text-sm text-muted">Toque pra colocar uma informação do relatório na mensagem:</p>
          <div className="flex flex-wrap gap-2">
            {VARIAVEIS.map((v) => (
              <button key={v.chave} type="button" onClick={() => inserir(v.chave)}
                className="cursor-pointer rounded-full border border-line bg-card-2 px-3 py-1.5 text-sm font-medium hover:border-brand hover:bg-soft">
                + {v.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <p className="text-sm text-muted">Ou comece de um modelo pronto:</p>
          <div className="flex flex-wrap gap-2">
            {MODELOS.map((m) => (
              <button key={m.nome} type="button" onClick={() => set('whatsappMensagem', m.texto)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold ${cfg.whatsappMensagem === m.texto ? 'border-brand bg-soft text-brand' : 'border-line hover:bg-soft'}`}>
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      <section aria-label="Prévia da mensagem" className="grid gap-2 lg:sticky lg:top-0">
        <div>
          <p className="font-semibold">Como vai chegar</p>
          <p className="text-sm text-muted">{real ? 'Com os dados do seu relatório' : 'Exemplo com dados fictícios'}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--zap-fundo)' }}>
          <div className="ml-auto w-fit max-w-[88%] rounded-xl rounded-tr-sm p-1.5 shadow-sm" style={{ background: 'var(--zap-bolha)', color: 'var(--zap-texto)' }}>
            <div className="flex items-center gap-3 rounded-lg bg-black/[0.07] p-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#107c41] text-white"><FileSpreadsheet size={22} /></span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{nomeXlsx}</span>
                <span className="block text-xs opacity-65">Planilha do Excel</span>
              </span>
            </div>
            {texto && <p className="px-1.5 pt-2 text-[15px] leading-snug break-words whitespace-pre-wrap">{formataZap(texto)}</p>}
            <p className="flex items-center justify-end gap-1 px-1.5 pt-1 text-[11px] opacity-65">
              {hora} <CheckCheck size={15} className="text-[#53bdeb]" />
            </p>
          </div>
        </div>
        <p className="text-sm text-muted">
          No celular a planilha vai anexada. No computador ela é baixada e o WhatsApp abre com a mensagem pronta; é só anexar o arquivo.
          Dica: *negrito*, _itálico_ e ~riscado~ funcionam como no WhatsApp.
        </p>
      </section>
    </div>
  )
}
