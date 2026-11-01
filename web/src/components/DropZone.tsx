import { useRef, useState } from 'react'
import { IconeArquivo } from './icones'
import { ui } from './ui'

interface Props {
  onArquivo: (f: File) => void
}

export function DropZone({ onArquivo }: Props) {
  const [arrastando, setArrastando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastando(false)
        const f = e.dataTransfer.files[0]
        if (f) onArquivo(f)
      }}
      className={`flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
        arrastando ? 'border-brand bg-soft' : 'border-line bg-card'
      }`}
    >
      <div className="grid size-16 place-items-center rounded-full bg-soft text-brand">
        <IconeArquivo width={32} height={32} />
      </div>
      <div>
        <p className="text-xl font-bold">Solte aqui o PDF do estoque</p>
        <p className="mt-1 text-muted">ou escolha o arquivo no seu computador</p>
      </div>
      <button type="button" className={`${ui.primario} text-lg`} onClick={() => input.current?.click()}>
        Escolher o PDF
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = '' // permite escolher o mesmo arquivo de novo
          if (f) onArquivo(f)
        }}
      />
    </div>
  )
}

export function Passos() {
  const passos = [
    ['1', 'Baixe o relatório em PDF no FDC, como sempre'],
    ['2', 'Solte o PDF aqui em cima'],
    ['3', 'Baixe a planilha ou mande pelo WhatsApp'],
  ]
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {passos.map(([n, t]) => (
        <li key={n} className="flex items-start gap-3 text-muted">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-soft text-sm font-bold text-brand">{n}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  )
}
