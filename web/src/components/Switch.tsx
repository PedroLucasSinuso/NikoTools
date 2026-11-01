interface Props {
  ligado: boolean
  onMudar: (v: boolean) => void
  rotulo: string
}

/** Interruptor acessível (role="switch"), no lugar de checkbox. */
export function Switch({ ligado, onMudar, rotulo }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onMudar(!ligado)}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${ligado ? 'bg-brand' : 'bg-line'}`}
    >
      <span
        className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
