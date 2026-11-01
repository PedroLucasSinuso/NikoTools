# NikoTools

Coleção de ferramentas de uso pessoal, pequenas e independentes.

**Site:** https://pedrolucassinuso.github.io/NikoTools/

## Ferramentas

### Estoque → planilha

Converte relatórios de posição de estoque em PDF (impressos como imagem, sem texto selecionável)
em `.xlsx`, com conferência automática das somas contra os totais do próprio relatório.

| Versão | Pasta | Como roda |
|---|---|---|
| Web | [`web/`](web/README.md) ([abrir](https://pedrolucassinuso.github.io/NikoTools/)) | Site estático. OCR no navegador, nada é enviado pra servidor. |
| Desktop | raiz do repositório (`estoque_facil/`) | Python + Tkinter, empacotável em `.exe` com PyInstaller. |

Detalhes de cada uma nos respectivos READMEs. Em resumo:

```bash
# web
cd web && npm ci && npm run dev

# desktop
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
python estoque_facil.py
```

## Testes

```bash
cd web && npm test            # TypeScript (vitest)
python -m pytest -q tests     # Python
```

## Dados

Arquivos de dados (`*.pdf`, `*.xlsx`) não são versionados.
