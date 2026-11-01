import type { ReactNode } from 'react'

interface Opcao<T extends string | number> {
  valor: T
  rotulo: ReactNode
}

interface Props<T extends string | number> {
  opcoes: Opcao<T>[]
  valor: T
  onMudar: (v: T) => void
  rotulo: string
  /** ocupa a largura toda, dividindo igual */
  cheio?: boolean
}

export function Segmentado<T extends string | number>({ opcoes, valor, onMudar, rotulo, cheio }: Props<T>) {
  return (
    <div role="group" aria-label={rotulo} className={`inline-flex gap-1 rounded-xl bg-soft p-1 ${cheio ? 'flex w-full' : ''}`}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onMudar(o.valor)}
            className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${cheio ? 'flex-1' : ''} ${
              ativo ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
