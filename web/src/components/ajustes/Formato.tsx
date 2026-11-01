import { Hash, Sigma } from 'lucide-react'
import type { Config } from '../../core/settings'
import { Segmentado } from '../Segmentado'
import { Switch } from '../Switch'
import { ui } from '../ui'
import { Campo, Opcao } from './Campo'

interface Props {
  cfg: Config
  onMudar: (c: Config) => void
}

export function Formato({ cfg, onMudar }: Props) {
  const set = <K extends keyof Config>(k: K, v: Config[K]) => onMudar({ ...cfg, [k]: v })
  return (
    <div className="grid gap-6">
      <Opcao icone={<Sigma size={22} />} titulo="Linhas de total" texto="Mostra o total de cada subseção, de cada seção e o total geral.">
        <Switch ligado={cfg.incluirTotais} onMudar={(v) => set('incluirTotais', v)} rotulo="Incluir linhas de total" />
      </Opcao>

      <Opcao icone={<Hash size={22} />} titulo="Casas decimais" texto="Como as quantidades aparecem na planilha.">
        <Segmentado<number>
          rotulo="Casas decimais"
          valor={cfg.casasDecimais}
          onMudar={(v) => set('casasDecimais', v as Config['casasDecimais'])}
          opcoes={[{ valor: 0, rotulo: '59' }, { valor: 1, rotulo: '59.0' }, { valor: 2, rotulo: '59.00' }]}
        />
      </Opcao>

      <Campo id="nome-aba" rotulo="Nome da aba" dica="É o nome que aparece na lingueta, embaixo da planilha.">
        <input id="nome-aba" type="text" value={cfg.nomeAba} maxLength={31} onChange={(e) => set('nomeAba', e.target.value)} className={ui.campo} />
        <div className="mt-1 flex border-b border-line">
          <span className="rounded-t-lg border border-b-0 border-line bg-card-2 px-4 py-1.5 text-sm font-semibold text-ok">
            {cfg.nomeAba || 'ESTOQUE'}
          </span>
        </div>
      </Campo>
    </div>
  )
}
