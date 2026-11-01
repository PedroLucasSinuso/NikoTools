# Estoque Fácil (web)

Site estático (React + Tailwind + TypeScript) que converte o PDF "Saldos de Estoque" do FDC em `.xlsx`,
**tudo dentro do navegador**: o PDF não sai do computador.
Online em https://pedrolucassinuso.github.io/NikoTools/

```
PDF ──pdf.js──▶ imagem 200dpi ──limpeza──▶ Tesseract (por, WASM) ──▶ parser ──▶ ExcelJS ──▶ .xlsx
                                                       └──▶ conferência das somas (totais do relatório)
```

## Rodar

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # parser + planilha (fixture com OCR real)
npm run build      # gera dist/
```

## Decisões que não são óbvias

- **Pré-processamento (`src/core/preprocesso.ts`)**: o pdf.js desenha a grade e as faixas cinzas do
  relatório mais pesadas que o poppler; sem limpar, o Tesseract lia só ~2/3 dos produtos. A limpeza tira
  linhas longas e fundo cinza.
- **PSM 6 (bloco único)**: o modo automático/coluna separa a coluna do código do resto da linha em
  páginas com poucas linhas.
- **Conferência**: o relatório traz *Total Sub. Seção / Total Seção / Total Geral*. O parser soma o que leu
  e compara; se não bater, a tela avisa e a planilha pinta as linhas suspeitas (o app nunca diz "OK" à toa).
- **Tudo self-hosted**: worker/WASM do Tesseract e o idioma `por` (`public/tessdata`, 1,4 MB) saem do
  próprio domínio, sem CDN de terceiros. `public/tesseract/` é gerado por `scripts/copiar-assets.mjs`.
- **WhatsApp**: `navigator.share({files})` anexa a planilha direto (iPhone/Android/Chrome/Edge). Sem
  suporte, baixa o arquivo e abre `wa.me` com o texto (o link do WhatsApp não aceita anexo).
- **Ajustes** ficam no `localStorage` (colunas, nomes, ordem, totais, casas decimais, WhatsApp, nome).

## Fixture de teste

`tests/fixtures/estoque.json` é a saída real do Tesseract pro PDF de exemplo, gerada pelo mesmo caminho do
site (pdf.js → limpeza → Tesseract) em Node:

```bash
npm run gerar-fixture -- "../amostras/estoque.pdf" tests/fixtures/estoque.json
```

## Deploy

`.github/workflows/pages.yml` publica no GitHub Pages a cada push em `main` que mexa em `web/`
(Settings → Pages → Source: **GitHub Actions**). O `BASE_PATH` vem do nome do repositório. Em outro host
(Cloudflare Pages etc.), build com `BASE_PATH=/` e publique `web/dist`.
