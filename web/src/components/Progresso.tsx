import type { Progresso as P } from '../core/ocr'

export function Progresso({ arquivo, p }: { arquivo: string; p: P }) {
  const texto =
    p.etapa === 'preparando' || p.total === 0
      ? 'Preparando o leitor… (na primeira vez demora um pouquinho mais)'
      : `Lendo a página ${Math.max(p.pagina, 1)} de ${p.total}…`
  const pct = Math.round(p.fracao * 100)
  return (
    <div className="entra rounded-3xl border border-line bg-card p-8 text-center" role="status" aria-live="polite">
      <p className="text-xl font-bold">Estou lendo o seu PDF</p>
      <p className="mt-1 truncate text-muted">{arquivo}</p>
      <div
        className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-soft"
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
      <p className="mt-4">{texto}</p>
      <p className="mt-1 text-sm text-muted">Pode deixar a janela aberta, já já fica pronto.</p>
    </div>
  )
}
