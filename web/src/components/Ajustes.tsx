import { useEffect, useRef } from 'react'
import { PADRAO, type Config } from '../core/settings'
import { IconeBaixo, IconeCima, IconeFechar } from './icones'
import { ui } from './ui'

interface Props {
  aberto: boolean
  cfg: Config
  onMudar: (c: Config) => void
  onFechar: () => void
}

const campoCls = 'w-full min-h-12 rounded-xl border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted'

export function Ajustes({ aberto, cfg, onMudar, onFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])

  const set = <K extends keyof Config>(k: K, v: Config[K]) => onMudar({ ...cfg, [k]: v })
  const mudaColuna = (i: number, parte: Partial<Config['colunas'][number]>) =>
    set('colunas', cfg.colunas.map((c, j) => (j === i ? { ...c, ...parte } : c)))
  const move = (i: number, d: -1 | 1) => {
    const cs = [...cfg.colunas]
    ;[cs[i], cs[i + d]] = [cs[i + d], cs[i]]
    set('colunas', cs)
  }

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && onFechar()}
      aria-labelledby="titulo-ajustes"
      className="m-auto w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-line bg-card p-0 text-ink shadow-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-6 py-4">
        <h2 id="titulo-ajustes" className="text-xl font-bold">Ajustes</h2>
        <button type="button" className={ui.discreto} onClick={onFechar} aria-label="Fechar ajustes">
          <IconeFechar /> Fechar
        </button>
      </div>

      <div className="grid gap-8 p-6">
        <section>
          <h3 className="text-lg font-bold">Colunas da planilha</h3>
          <p className="mb-3 text-muted">Marque as que quer, mude o nome e a ordem. A coluna "Pedido" sai em branco pra você preencher.</p>
          <ul className="grid gap-2">
            {cfg.colunas.map((c, i) => (
              <li key={c.campo} className={`flex items-center gap-2 rounded-2xl border border-line p-2 ${c.ativa ? '' : 'opacity-60'}`}>
                <input
                  type="checkbox" checked={c.ativa} onChange={(e) => mudaColuna(i, { ativa: e.target.checked })}
                  aria-label={`Incluir a coluna ${c.titulo}`} className="size-6 shrink-0 accent-[var(--brand)]"
                />
                <input
                  type="text" value={c.titulo} onChange={(e) => mudaColuna(i, { titulo: e.target.value })}
                  aria-label={`Nome da coluna ${PADRAO.colunas.find((p) => p.campo === c.campo)?.titulo}`}
                  className={`${campoCls} min-w-0 flex-1`}
                />
                <button type="button" className={`${ui.discreto} px-2`} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir ${c.titulo}`}><IconeCima /></button>
                <button type="button" className={`${ui.discreto} px-2`} disabled={i === cfg.colunas.length - 1} onClick={() => move(i, 1)} aria-label={`Descer ${c.titulo}`}><IconeBaixo /></button>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4">
          <h3 className="text-lg font-bold">Jeito da planilha</h3>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={cfg.incluirTotais} onChange={(e) => set('incluirTotais', e.target.checked)} className="size-6 accent-[var(--brand)]" />
            <span>Incluir as linhas de total (por seção e geral)</span>
          </label>
          <label className="grid gap-1">
            <span className="font-medium">Como mostrar as quantidades</span>
            <select
              value={cfg.casasDecimais} onChange={(e) => set('casasDecimais', Number(e.target.value) as Config['casasDecimais'])}
              className={campoCls}
            >
              <option value={0}>59 (sem casas)</option>
              <option value={1}>59.0</option>
              <option value={2}>59.00 (como no FDC)</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-medium">Nome da aba</span>
            <input type="text" value={cfg.nomeAba} maxLength={31} onChange={(e) => set('nomeAba', e.target.value)} className={campoCls} />
          </label>
        </section>

        <section className="grid gap-4">
          <h3 className="text-lg font-bold">WhatsApp</h3>
          <label className="grid gap-1">
            <span className="font-medium">Número de quem recebe</span>
            <input
              type="tel" inputMode="tel" placeholder="(11) 99999-8888" value={cfg.whatsappNumero}
              onChange={(e) => set('whatsappNumero', e.target.value)} className={campoCls}
            />
            <span className="text-sm text-muted">Com DDD. Se deixar vazio, você escolhe o contato na hora de enviar.</span>
          </label>
          <label className="grid gap-1">
            <span className="font-medium">Mensagem</span>
            <input type="text" value={cfg.whatsappMensagem} onChange={(e) => set('whatsappMensagem', e.target.value)} className={campoCls} />
            <span className="text-sm text-muted">
              Pode usar <code>{'{fornecedor}'}</code>, <code>{'{data}'}</code> e <code>{'{loja}'}</code>: o programa troca pelo que está no relatório.
            </span>
          </label>
        </section>

        <section className="grid gap-4">
          <h3 className="text-lg font-bold">Sobre você</h3>
          <label className="grid gap-1">
            <span className="font-medium">Seu nome (pra eu te dar um oi)</span>
            <input type="text" value={cfg.nome} onChange={(e) => set('nome', e.target.value)} className={campoCls} />
          </label>
        </section>

        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4">
          <button
            type="button" className={ui.discreto}
            onClick={() => window.confirm('Voltar todos os ajustes ao jeito original?') && onMudar(structuredClone(PADRAO))}
          >
            Voltar ao padrão
          </button>
          <button type="button" className={ui.primario} onClick={onFechar}>Pronto</button>
        </div>
        <p className="text-center text-sm text-muted">Os ajustes ficam guardados neste navegador, neste computador.</p>
      </div>
    </dialog>
  )
}
