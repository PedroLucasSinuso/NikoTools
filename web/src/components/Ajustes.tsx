import { Check, MessageCircle, Sheet, SlidersHorizontal, UserRound, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Config } from '../core/settings'
import type { ContextoMensagem } from '../core/whatsapp'
import { Colunas } from './ajustes/Colunas'
import { Formato } from './ajustes/Formato'
import { Voce } from './ajustes/Voce'
import { WhatsApp } from './ajustes/WhatsApp'
import { ui } from './ui'

export type Aba = 'colunas' | 'formato' | 'whatsapp' | 'perfil'

interface Props {
  /** aba aberta; null = fechado */
  aba: Aba | null
  cfg: Config
  onMudar: (c: Config) => void
  onAba: (a: Aba) => void
  onFechar: () => void
  ctx: ContextoMensagem | null
  nomeXlsx: string
}

const ABAS: { id: Aba; nome: string; titulo: string; texto: string; Icone: LucideIcon }[] = [
  { id: 'colunas', nome: 'Colunas', titulo: 'Colunas da planilha', texto: 'Escolha o que entra na planilha e em que ordem.', Icone: Sheet },
  { id: 'formato', nome: 'Formato', titulo: 'Formato', texto: 'Totais, casas decimais e nome da aba.', Icone: SlidersHorizontal },
  { id: 'whatsapp', nome: 'WhatsApp', titulo: 'WhatsApp', texto: 'Quem recebe e o que a mensagem diz.', Icone: MessageCircle },
  { id: 'perfil', nome: 'Você', titulo: 'Você', texto: 'Seu nome e a opção de recomeçar.', Icone: UserRound },
]

export function Ajustes({ aba, cfg, onMudar, onAba, onFechar, ctx, nomeXlsx }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aba && !d.open) d.showModal()
    if (!aba && d.open) d.close()
  }, [aba])

  const atual = ABAS.find((a) => a.id === aba) ?? ABAS[0]

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && onFechar()}
      aria-labelledby="titulo-ajustes"
      className="m-auto h-[min(46rem,calc(100dvh-1.5rem))] w-[min(64rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-line bg-card p-0 shadow-2xl"
    >
      <div className="flex h-full flex-col md:flex-row">
        <nav aria-label="Seções dos ajustes" className="flex shrink-0 flex-col border-b border-line bg-card-2 md:w-60 md:border-r md:border-b-0">
          <div className="flex items-center justify-between px-5 pt-4 md:block md:px-5 md:pt-6">
            <h2 id="titulo-ajustes" className="font-display text-2xl font-extrabold">Ajustes</h2>
            <button type="button" onClick={onFechar} aria-label="Fechar ajustes" className="grid size-10 cursor-pointer place-items-center rounded-xl text-muted hover:bg-soft hover:text-ink md:hidden">
              <X size={20} />
            </button>
          </div>
          <ul className="flex gap-1 overflow-x-auto p-3 md:flex-col md:p-4 md:pt-5">
            {ABAS.map(({ id, nome, Icone }) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  aria-current={id === atual.id ? 'page' : undefined}
                  onClick={() => onAba(id)}
                  className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2 text-left font-semibold transition ${
                    id === atual.id ? 'bg-brand text-brand-ink shadow-sm' : 'text-muted hover:bg-soft hover:text-ink'
                  }`}
                >
                  <Icone size={19} /> {nome}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-auto hidden items-center gap-1.5 px-5 pb-5 text-sm text-muted md:flex">
            <Check size={15} className="text-ok" /> Salvo automaticamente
          </p>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h3 className="font-display text-xl font-bold">{atual.titulo}</h3>
              <p className="text-sm text-muted">{atual.texto}</p>
            </div>
            <button type="button" onClick={onFechar} aria-label="Fechar ajustes" className="hidden size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted hover:bg-soft hover:text-ink md:grid">
              <X size={20} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {atual.id === 'colunas' && <Colunas cfg={cfg} onMudar={onMudar} />}
            {atual.id === 'formato' && <Formato cfg={cfg} onMudar={onMudar} />}
            {atual.id === 'whatsapp' && <WhatsApp cfg={cfg} onMudar={onMudar} ctx={ctx} nomeXlsx={nomeXlsx} />}
            {atual.id === 'perfil' && <Voce cfg={cfg} onMudar={onMudar} />}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
            <p className="flex items-center gap-1.5 text-sm text-muted md:hidden"><Check size={15} className="text-ok" /> Salvo</p>
            <button type="button" className={`${ui.primario} ml-auto`} onClick={onFechar}>Pronto</button>
          </footer>
        </div>
      </div>
    </dialog>
  )
}
