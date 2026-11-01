import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Ajustes, type Aba } from './components/Ajustes'
import { DropZone, Passos } from './components/DropZone'
import { Progresso as BarraProgresso } from './components/Progresso'
import { Resultado } from './components/Resultado'
import { ui } from './components/ui'
import type { Progresso } from './core/ocr'
import { interpreta, produtos } from './core/parser'
import * as settings from './core/settings'
import type { Relatorio } from './core/types'
import { contexto } from './core/whatsapp'
import { nomeDoArquivo } from './core/xlsx-nome'

type Estado =
  | { fase: 'inicio'; erro?: string }
  | { fase: 'lendo'; arquivo: string; p: Progresso }
  | { fase: 'pronto'; arquivo: string; rel: Relatorio; imagens: string[] }

export default function App() {
  const [estado, setEstado] = useState<Estado>({ fase: 'inicio' })
  const [cfg, setCfg] = useState(settings.carrega)
  const [ajustes, setAjustes] = useState<Aba | null>(null)

  useEffect(() => settings.salva(cfg), [cfg])

  // libera as imagens do PDF anterior quando troca de arquivo ou sai da tela
  const imagens = estado.fase === 'pronto' ? estado.imagens : null
  useEffect(() => () => imagens?.forEach((u) => URL.revokeObjectURL(u)), [imagens])

  async function converter(arquivo: File) {
    if (!/\.pdf$/i.test(arquivo.name) && arquivo.type !== 'application/pdf') {
      setEstado({ fase: 'inicio', erro: 'Esse arquivo não é um PDF. Escolha o relatório de estoque que você baixou do FDC.' })
      return
    }
    setEstado({ fase: 'lendo', arquivo: arquivo.name, p: { etapa: 'preparando', pagina: 0, total: 0, fracao: 0 } })
    try {
      const { lePdf } = await import('./core/ocr') // carrega o leitor só quando precisa
      const leitura = await lePdf(arquivo, (p) => setEstado({ fase: 'lendo', arquivo: arquivo.name, p }))
      const rel = interpreta(leitura.paginas)
      if (!produtos(rel).length) {
        leitura.imagens.forEach((u) => URL.revokeObjectURL(u))
        setEstado({ fase: 'inicio', erro: 'Não encontrei nenhum produto nesse PDF. Ele é mesmo o relatório de "Saldos de Estoque" do FDC?' })
        return
      }
      setEstado({ fase: 'pronto', arquivo: arquivo.name, rel, imagens: leitura.imagens })
    } catch (e) {
      setEstado({ fase: 'inicio', erro: e instanceof Error ? e.message : 'Algo deu errado ao ler o PDF.' })
    }
  }

  const pronto = estado.fase === 'pronto'
  const nome = cfg.nome.trim()

  return (
    <div className={`mx-auto flex min-h-dvh flex-col gap-8 px-4 py-6 sm:px-6 ${pronto ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}icone.svg`} alt="" className="size-11 rounded-xl shadow-card" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Estoque Fácil</h1>
        </div>
        <button type="button" className={ui.secundario} onClick={() => setAjustes('colunas')}>
          <Settings2 size={18} /> Ajustes
        </button>
      </header>

      <main className="grid gap-8" aria-live="polite">
        {estado.fase === 'inicio' && (
          <div className="entra grid gap-8">
            <div>
              <p className="font-semibold text-brand">{nome ? `Oi, ${nome}!` : 'Oi!'}</p>
              <h2 className="mt-1 font-display text-4xl leading-[1.08] font-extrabold sm:text-5xl">
                Do PDF do estoque pra planilha, em um instante.
              </h2>
              <p className="mt-3 max-w-xl text-lg text-muted">Solte o relatório do FDC aqui. Eu leio, confiro as somas e deixo o Excel pronto pra enviar.</p>
            </div>
            {estado.erro && (
              <p role="alert" className="rounded-xl border border-warn-line bg-warn-bg p-4 text-warn">{estado.erro}</p>
            )}
            <DropZone onArquivo={converter} />
            <Passos />
          </div>
        )}
        {estado.fase === 'lendo' && <BarraProgresso arquivo={estado.arquivo} p={estado.p} />}
        {estado.fase === 'pronto' && (
          <Resultado
            arquivoPdf={estado.arquivo} rel={estado.rel} cfg={cfg} imagens={estado.imagens}
            onOutro={() => setEstado({ fase: 'inicio' })} onAjustes={setAjustes}
          />
        )}
      </main>

      <footer className="mt-auto pt-6 text-center text-sm text-muted">
        Tudo acontece aqui no seu computador: o PDF não é enviado pra lugar nenhum.
      </footer>

      <Ajustes
        aba={ajustes} cfg={cfg} onMudar={setCfg} onAba={setAjustes} onFechar={() => setAjustes(null)}
        ctx={pronto ? contexto(estado.rel) : null}
        nomeXlsx={pronto ? nomeDoArquivo(estado.arquivo) : 'estoque.xlsx'}
      />
    </div>
  )
}
