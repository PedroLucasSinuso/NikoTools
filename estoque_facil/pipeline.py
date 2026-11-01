"""Fluxo completo: PDF -> OCR -> conferência -> xlsx."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from . import ocr, parser, planilha
from .config import Config
from .parser import Relatorio


@dataclass
class Resultado:
    pdf: Path
    xlsx: Path
    relatorio: Relatorio


def caminho_de_saida(pdf: Path, cfg: Config) -> Path:
    pasta = cfg.pasta_saida or pdf.parent
    pasta.mkdir(parents=True, exist_ok=True)
    destino = pasta / f"{pdf.stem}.xlsx"
    n = 2
    while True:
        try:
            # se a planilha antiga estiver aberta no Excel o Windows não deixa sobrescrever
            if not destino.exists():
                break
            destino.open("r+b").close()
            break
        except PermissionError:
            destino = pasta / f"{pdf.stem} ({n}).xlsx"
            n += 1
    return destino


def converte(pdf: Path, cfg: Config, progresso: Callable[[int, int], None] | None = None) -> Resultado:
    paginas = ocr.le_pdf(pdf, cfg.dpi, progresso)
    rel = parser.interpreta(paginas)
    if not rel.produtos:
        raise ValueError("Não encontrei nenhum produto neste PDF. Ele é mesmo o relatório de "
                         "\"Saldos de Estoque\" do FDC?")
    xlsx = planilha.grava(rel, caminho_de_saida(pdf, cfg), cfg)
    return Resultado(pdf, xlsx, rel)


def resumo(res: Resultado) -> str:
    rel = res.relatorio
    linhas = [f"{len(rel.produtos)} produtos lidos.", f"Planilha salva em:\n{res.xlsx}"]
    if not rel.avisos:
        linhas.insert(1, "Conferência OK: as somas batem com os totais do relatório.")
    else:
        linhas.append("\nCONFIRA ANTES DE ENVIAR (linhas amarelas/vermelhas na planilha):")
        linhas += [f" - {a.texto}" for a in rel.avisos]
    return "\n".join(linhas)
