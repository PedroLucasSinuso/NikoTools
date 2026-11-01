import { RotateCcw, UserRound } from 'lucide-react'
import { useState } from 'react'
import { PADRAO, type Config } from '../../core/settings'
import { ui } from '../ui'
import { Campo } from './Campo'

interface Props {
  cfg: Config
  onMudar: (c: Config) => void
}

export function Voce({ cfg, onMudar }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  return (
    <div className="grid gap-7">
      <Campo id="meu-nome" rotulo="Seu nome" dica="Aparece na tela inicial, num oi simpático.">
        <div className="relative">
          <UserRound size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input id="meu-nome" type="text" value={cfg.nome} onChange={(e) => onMudar({ ...cfg, nome: e.target.value })} className={`${ui.campo} pl-11`} />
        </div>
      </Campo>

      <section className="grid gap-3 rounded-2xl border border-line bg-card-2 p-4">
        <div>
          <p className="font-semibold">Voltar ao jeito original</p>
          <p className="text-sm text-muted">Desfaz todos os ajustes (colunas, nomes, WhatsApp). Não apaga nenhum arquivo.</p>
        </div>
        {confirmando ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={ui.primario} onClick={() => { onMudar(structuredClone(PADRAO)); setConfirmando(false) }}>
              <RotateCcw size={16} /> Sim, restaurar
            </button>
            <button type="button" className={ui.discreto} onClick={() => setConfirmando(false)}>Cancelar</button>
          </div>
        ) : (
          <button type="button" className={`${ui.secundario} w-fit`} onClick={() => setConfirmando(true)}>
            <RotateCcw size={16} /> Restaurar ajustes
          </button>
        )}
      </section>

      <p className="text-sm text-muted">Os ajustes ficam guardados neste navegador, neste computador. Em outro navegador ou aparelho, começam do padrão.</p>
    </div>
  )
}
