/** Classes reutilizadas: botões grandes (alvo de toque ≥ 48px) e cartões. */
const botao = 'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'

export const ui = {
  primario: `${botao} bg-brand text-brand-ink shadow-sm hover:bg-brand-hover`,
  secundario: `${botao} border border-line bg-card text-ink hover:bg-soft`,
  discreto: `${botao} min-h-10 px-3 py-2 text-muted hover:bg-soft hover:text-ink`,
  cartao: 'rounded-3xl border border-line bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]',
}
