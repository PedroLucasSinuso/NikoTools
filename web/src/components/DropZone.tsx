import { Download, FileSpreadsheet, FileUp, MousePointerClick, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'
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
      className={`relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center shadow-card transition ${
        arrastando ? 'scale-[1.01] border-brand bg-soft' : 'border-line bg-card'
      }`}
    >
      <div className="relative grid size-20 place-items-center rounded-2xl bg-soft text-brand">
        <FileUp size={38} strokeWidth={1.75} />
        <span className="absolute -right-2 -bottom-2 grid size-9 place-items-center rounded-full border-4 border-card bg-brand text-brand-ink">
          <FileSpreadsheet size={16} />
        </span>
      </div>
      <div>
        <p className="font-display text-2xl font-bold">Solte aqui o PDF do estoque</p>
        <p className="mt-1 text-muted">ou escolha o arquivo no seu computador</p>
      </div>
      <button type="button" className={`${ui.primario} px-8 text-lg`} onClick={() => input.current?.click()}>
        <FileUp size={20} /> Escolher o PDF
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
      <p className="flex items-center gap-2 text-sm text-muted">
        <ShieldCheck size={16} className="text-ok" /> O PDF não sai do seu computador
      </p>
    </div>
  )
}

const PASSOS = [
  { Icone: Download, titulo: 'Baixe o PDF', texto: 'Gere o relatório de estoque no FDC, como sempre.' },
  { Icone: MousePointerClick, titulo: 'Solte aqui', texto: 'Eu leio o PDF e confiro as somas.' },
  { Icone: FileSpreadsheet, titulo: 'Pegue a planilha', texto: 'Baixe o Excel ou mande pelo WhatsApp.' },
]

export function Passos() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {PASSOS.map(({ Icone, titulo, texto }) => (
        <li key={titulo} className="flex items-start gap-3 rounded-2xl border border-line bg-card/60 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-soft text-brand">
            <Icone size={20} />
          </span>
          <span>
            <span className="block font-semibold">{titulo}</span>
            <span className="text-sm text-muted">{texto}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
