import { FileText, Sheet, SlidersHorizontal, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { Config } from '../core/settings'
import type { Relatorio } from '../core/types'
import { NUMERICOS, valor } from '../core/valores'
import { Segmentado } from './Segmentado'
import { ui } from './ui'

interface Props {
  rel: Relatorio
  cfg: Config
  imagens: string[]
  onAjustes: () => void
}

type Visao = 'pdf' | 'planilha'

/** PDF original e planilha lado a lado (abas no celular), pra conferir de relance. */
export function Comparador({ rel, cfg, imagens, onAjustes }: Props) {
  const [visao, setVisao] = useState<Visao>('planilha')
  return (
    <section className="grid gap-4" aria-label="Comparar PDF e planilha">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Compare com o original</h2>
        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <Segmentado<Visao>
              rotulo="O que mostrar"
              valor={visao}
              onMudar={setVisao}
              opcoes={[
                { valor: 'planilha', rotulo: <><Sheet size={16} /> Planilha</> },
                { valor: 'pdf', rotulo: <><FileText size={16} /> PDF</> },
              ]}
            />
          </div>
          <button type="button" className={ui.discreto} onClick={onAjustes}>
            <SlidersHorizontal size={16} /> Colunas
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Painel mostrar={visao === 'pdf'} icone={<FileText size={16} />} titulo="PDF original" detalhe={`${imagens.length} ${imagens.length === 1 ? 'página' : 'páginas'}`}>
          <VisualizadorPdf imagens={imagens} />
        </Painel>
        <Painel mostrar={visao === 'planilha'} icone={<Sheet size={16} />} titulo="Planilha" detalhe={cfg.nomeAba || 'ESTOQUE'}>
          <PreviaPlanilha rel={rel} cfg={cfg} />
        </Painel>
      </div>
    </section>
  )
}

function Painel({ mostrar, icone, titulo, detalhe, children }: { mostrar: boolean; icone: ReactNode; titulo: string; detalhe: string; children: ReactNode }) {
  return (
    <div className={`${ui.cartao} min-w-0 flex-col overflow-hidden lg:flex ${mostrar ? 'flex' : 'hidden'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-card-2 px-4 py-2.5 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-ink">
          <span className="text-brand">{icone}</span>
          {titulo}
        </span>
        <span className="truncate text-muted">{detalhe}</span>
      </div>
      <div className="h-[min(68vh,42rem)] overflow-auto">{children}</div>
    </div>
  )
}

const ZOOMS = [100, 140, 190]

function VisualizadorPdf({ imagens }: { imagens: string[] }) {
  const [z, setZ] = useState(0)
  return (
    <div className="relative min-h-full bg-soft/60 p-3">
      <div className="sticky top-0 z-10 mb-2 flex justify-end gap-1">
        <button type="button" className={`${ui.secundario} min-h-9 px-2.5 py-1`} disabled={z === 0} onClick={() => setZ(z - 1)} aria-label="Diminuir o PDF">
          <ZoomOut size={16} />
        </button>
        <button type="button" className={`${ui.secundario} min-h-9 px-2.5 py-1`} disabled={z === ZOOMS.length - 1} onClick={() => setZ(z + 1)} aria-label="Aumentar o PDF">
          <ZoomIn size={16} />
        </button>
      </div>
      <div className="grid gap-4" style={{ width: `${ZOOMS[z]}%` }}>
        {imagens.map((src, i) => (
          <figure key={src} className="m-0">
            <img src={src} alt={`Página ${i + 1} do PDF`} className="block w-full rounded-md bg-white shadow-md ring-1 ring-black/10" />
            <figcaption className="mt-1.5 text-center text-xs text-muted">Página {i + 1}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

const LARGURA_CH: Record<string, number> = { produto: 8, descricao: 34, un: 5, quant: 8, minimo: 8, max: 8, ean: 15, saldo: 9 }
const letra = (i: number) => String.fromCharCode(65 + i)

function PreviaPlanilha({ rel, cfg }: { rel: Relatorio; cfg: Config }) {
  const colunas = cfg.colunas.filter((c) => c.ativa)
  const linhas = useMemo(() => rel.linhas.filter((l) => l.tipo === 'produto' || cfg.incluirTotais), [rel, cfg.incluirTotais])
  const fmt = (n: number) => n.toFixed(cfg.casasDecimais)
  const largura = 5 + colunas.reduce((s, c) => s + LARGURA_CH[c.campo], 0)

  if (!colunas.length)
    return <p className="p-6 text-center text-muted">Nenhuma coluna marcada. Escolha ao menos uma em "Colunas".</p>

  return (
    <div className="planilha flex min-h-full flex-col">
      <div className="flex-1 overflow-visible">
        <table style={{ width: `${largura}ch`, minWidth: '100%' }}>
          <colgroup>
            <col style={{ width: '5ch' }} />
            {colunas.map((c) => <col key={c.campo} style={{ width: `${LARGURA_CH[c.campo]}ch` }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="num-linha" />
              {colunas.map((c, i) => <th key={c.campo}>{letra(i)}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num-linha">1</td>
              {colunas.map((c) => (
                <td key={c.campo} style={{ background: '#d9eaf7', fontWeight: 700, textAlign: 'center', borderBottom: '2px solid #666' }}>
                  {c.titulo}
                </td>
              ))}
            </tr>
            {linhas.map((l, i) => {
              const fundo =
                l.tipo === 'produto' ? (l.conferir ? '#fff2cc' : undefined) : l.conferir ? '#f4cccc' : l.tipo === 'sub' ? '#e7e6e6' : '#d9ead3'
              return (
                <tr key={i} title={l.nota || undefined} style={{ background: fundo, fontWeight: l.tipo === 'produto' || l.tipo === 'sub' ? 400 : 700 }}>
                  <td className="num-linha">{i + 2}</td>
                  {colunas.map((c) => {
                    const v = valor(l, c.campo)
                    const num = NUMERICOS.includes(c.campo)
                    return (
                      <td key={c.campo} style={{ textAlign: c.campo === 'descricao' ? 'left' : 'center' }}>
                        {typeof v === 'number' && num ? fmt(v) : (v ?? '')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="sticky bottom-0 flex border-t border-[#d4d4d4] bg-[#f3f3f3] px-2 pt-1 text-xs">
        <span className="rounded-t-md border border-b-0 border-[#d4d4d4] bg-white px-3 py-1 font-semibold text-[#107c41]">
          {cfg.nomeAba || 'ESTOQUE'}
        </span>
      </div>
    </div>
  )
}
