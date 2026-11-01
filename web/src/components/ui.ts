/** Classes reutilizadas: botões grandes (alvo de toque ≥ 48px) e superfícies. */
const botao =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

export const ui = {
  primario: `${botao} bg-brand text-brand-ink shadow-sm hover:bg-brand-hover`,
  secundario: `${botao} border border-line bg-card text-ink hover:bg-soft`,
  discreto: `${botao} min-h-10 px-3 py-2 text-muted hover:bg-soft hover:text-ink`,
  cartao: 'rounded-2xl border border-line bg-card shadow-card',
  campo:
    'w-full min-h-12 rounded-xl border border-line bg-card-2 px-3.5 py-2.5 text-ink placeholder:text-muted/70 transition focus:border-brand focus:bg-card focus:outline-none focus:ring-4 focus:ring-brand/15',
}
