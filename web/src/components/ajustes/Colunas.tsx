import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from 'lucide-react'
import { useState } from 'react'
import type { Config } from '../../core/settings'
import { Switch } from '../Switch'

interface Props {
  cfg: Config
  onMudar: (c: Config) => void
}

const letra = (i: number) => String.fromCharCode(65 + i)

export function Colunas({ cfg, onMudar }: Props) {
  const [arrastando, setArrastando] = useState<number | null>(null)
  const ativas = cfg.colunas.filter((c) => c.ativa)

  const muda = (i: number, parte: Partial<Config['colunas'][number]>) =>
    onMudar({ ...cfg, colunas: cfg.colunas.map((c, j) => (j === i ? { ...c, ...parte } : c)) })
  const move = (de: number, para: number) => {
    if (para < 0 || para >= cfg.colunas.length || de === para) return
    const cs = [...cfg.colunas]
    cs.splice(para, 0, cs.splice(de, 1)[0])
    onMudar({ ...cfg, colunas: cs })
  }

  return (
    <div className="grid gap-6">
      <section aria-label="Cabeçalho da planilha" className="grid gap-2">
        <p className="text-sm font-semibold text-muted">Assim fica o cabeçalho da planilha</p>
        <div className="planilha overflow-x-auto rounded-xl border border-line">
          {ativas.length ? (
            <div className="flex min-w-max">
              {ativas.map((c, i) => (
                <div key={c.campo} className="min-w-28 flex-1 border-r border-[#d4d4d4] last:border-r-0">
                  <div className="bg-[#f3f3f3] py-0.5 text-center text-xs text-[#5b5b5b]">{letra(i)}</div>
                  <div className="border-t border-[#d4d4d4] bg-[#d9eaf7] px-3 py-1.5 text-center font-bold">{c.titulo || '(sem nome)'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-center text-[#5b5b5b]">Nenhuma coluna marcada</p>
          )}
        </div>
      </section>

      <section aria-label="Lista de colunas" className="grid gap-2">
        <p className="text-sm text-muted">
          Ligue as colunas que quer na planilha, mude o nome e arraste (ou use as setas) pra trocar a ordem.
          A coluna <strong>Pedido</strong> sai em branco, pra preencher depois.
        </p>
        <ul className="grid gap-2">
          {cfg.colunas.map((c, i) => (
            <li
              key={c.campo}
              draggable
              onDragStart={() => setArrastando(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (arrastando !== null) move(arrastando, i); setArrastando(null) }}
              onDragEnd={() => setArrastando(null)}
              className={`flex items-center gap-2 rounded-xl border border-line bg-card-2 p-2 pr-3 transition ${c.ativa ? '' : 'opacity-60'} ${arrastando === i ? 'opacity-40' : ''}`}
            >
              <GripVertical size={18} className="shrink-0 cursor-grab text-muted" aria-hidden />
              <input
                type="text"
                value={c.titulo}
                onChange={(e) => muda(i, { titulo: e.target.value })}
                aria-label={`Nome da coluna ${c.campo}`}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 font-medium hover:border-line focus:border-brand focus:bg-card focus:outline-none"
              />
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Subir ${c.titulo}`}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent">
                <ArrowUp size={16} />
              </button>
              <button type="button" disabled={i === cfg.colunas.length - 1} onClick={() => move(i, i + 1)} aria-label={`Descer ${c.titulo}`}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent">
                <ArrowDown size={16} />
              </button>
              <span className="text-muted" aria-hidden>{c.ativa ? <Eye size={18} /> : <EyeOff size={18} />}</span>
              <Switch ligado={c.ativa} onMudar={(v) => muda(i, { ativa: v })} rotulo={`Incluir a coluna ${c.titulo}`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
