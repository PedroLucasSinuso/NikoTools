import type { ReactNode } from 'react'

/** Rótulo + controle + dica, no padrão de todos os painéis. */
export function Campo({ id, rotulo, dica, children }: { id?: string; rotulo: string; dica?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">{rotulo}</label>
      {children}
      {dica && <p className="text-sm text-muted">{dica}</p>}
    </div>
  )
}

/** Linha de opção: ícone, título, explicação e o controle à direita. */
export function Opcao({ icone, titulo, texto, children }: { icone: ReactNode; titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-card-2 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-soft text-brand">{icone}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{titulo}</p>
        <p className="text-sm text-muted">{texto}</p>
      </div>
      {children}
    </div>
  )
}
