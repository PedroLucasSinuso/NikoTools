import { useEffect, useState } from 'react'
import { Ajustes } from './components/Ajustes'
import { DropZone, Passos } from './components/DropZone'
import { IconeAjustes } from './components/icones'
import { Progresso as BarraProgresso } from './components/Progresso'
import { Resultado } from './components/Resultado'
import { ui } from './components/ui'
import type { Progresso } from './core/ocr'
import { interpreta, produtos } from './core/parser'
import * as settings from './core/settings'
import type { Relatorio } from './core/types'

type Estado =
  | { fase: 'inicio'; erro?: string }
  | { fase: 'lendo'; arquivo: string; p: Progresso }
  | { fase: 'pronto'; arquivo: string; rel: Relatorio }

export default function App() {
  const [estado, setEstado] = useState<Estado>({ fase: 'inicio' })
  const [cfg, setCfg] = useState(settings.carrega)
  const [ajustes, setAjustes] = useState(false)

  useEffect(() => settings.salva(cfg), [cfg])

  async function converter(arquivo: File) {
    if (!/\.pdf$/i.test(arquivo.name) && arquivo.type !== 'application/pdf') {
      setEstado({ fase: 'inicio', erro: 'Esse arquivo não é um PDF. Escolha o relatório de estoque que você baixou do FDC.' })
      return
    }
    setEstado({ fase: 'lendo', arquivo: arquivo.name, p: { etapa: 'preparando', pagina: 0, total: 0, fracao: 0 } })
    try {
      const { lePdf } = await import('./core/ocr') // carrega o leitor só quando precisa
      const paginas = await lePdf(arquivo, (p) => setEstado({ fase: 'lendo', arquivo: arquivo.name, p }))
      const rel = interpreta(paginas)
      if (!produtos(rel).length) {
        setEstado({ fase: 'inicio', erro: 'Não encontrei nenhum produto nesse PDF. Ele é mesmo o relatório de "Saldos de Estoque" do FDC?' })
        return
      }
      setEstado({ fase: 'pronto', arquivo: arquivo.name, rel })
    } catch (e) {
      setEstado({ fase: 'inicio', erro: e instanceof Error ? e.message : 'Algo deu errado ao ler o PDF.' })
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}icone.svg`} alt="" className="size-10 rounded-xl" />
          <h1 className="text-2xl font-extrabold tracking-tight">Estoque Fácil</h1>
        </div>
        <button type="button" className={ui.secundario} onClick={() => setAjustes(true)}>
          <IconeAjustes /> Ajustes
        </button>
      </header>

      <main className="grid gap-6" aria-live="polite">
        {estado.fase === 'inicio' && (
          <div className="entra grid gap-6">
            <div>
              <p className="text-2xl font-bold">{cfg.nome.trim() ? `Oi, ${cfg.nome.trim()}!` : 'Oi!'} Vamos transformar o estoque em planilha?</p>
              <p className="mt-1 text-muted">É só soltar o PDF do FDC aqui. Eu cuido do resto.</p>
            </div>
            {estado.erro && (
              <p role="alert" className="rounded-2xl border border-warn-line bg-warn-bg p-4 text-warn">{estado.erro}</p>
            )}
            <DropZone onArquivo={converter} />
            <Passos />
          </div>
        )}
        {estado.fase === 'lendo' && <BarraProgresso arquivo={estado.arquivo} p={estado.p} />}
        {estado.fase === 'pronto' && (
          <Resultado arquivoPdf={estado.arquivo} rel={estado.rel} cfg={cfg} onOutro={() => setEstado({ fase: 'inicio' })} />
        )}
      </main>

      <footer className="mt-auto pt-6 text-center text-sm text-muted">
        Tudo acontece aqui no seu computador: o PDF não é enviado pra lugar nenhum.
      </footer>

      <Ajustes aberto={ajustes} cfg={cfg} onMudar={setCfg} onFechar={() => setAjustes(false)} />
    </div>
  )
}
