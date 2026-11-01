"""Escreve o xlsx no mesmo visual da planilha de referência."""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

from .config import Config
from .parser import Linha, Relatorio

_FINA = Side(style="thin", color="B7B7B7")
_BORDA = Border(left=_FINA, right=_FINA, top=_FINA, bottom=_FINA)
_BORDA_CAB = Border(left=_FINA, right=_FINA, top=_FINA, bottom=Side(style="medium", color="666666"))
_CAB = PatternFill("solid", fgColor="D9EAF7")
_SUB = PatternFill("solid", fgColor="E7E6E6")
_SEC = PatternFill("solid", fgColor="D9EAD3")
_CONFERIR = PatternFill("solid", fgColor="FFF2CC")
_PROBLEMA = PatternFill("solid", fgColor="F4CCCC")
_NUMERICOS = {"quant", "minimo", "max"}
_LARGURAS = {"produto": 12, "descricao": 52, "un": 8, "quant": 12, "minimo": 12, "max": 10, "ean": 20, "saldo": 12}


def _valor(linha: Linha, campo: str):
    if linha.tipo != "produto":
        return {"descricao": linha.descricao, "quant": linha.quant}.get(campo)
    v = getattr(linha, campo)
    if campo == "produto" and v.isdigit():
        return int(v)
    return v if v not in ("", None) else None


def grava(rel: Relatorio, caminho: Path, cfg: Config) -> Path:
    wb = Workbook()
    ws = wb.active
    ws.title = cfg.nome_da_aba
    ws.sheet_view.showGridLines = False
    campos = [c for c, _ in cfg.colunas]
    fmt_num = "0" if cfg.casas_decimais == 0 else "0." + "0" * cfg.casas_decimais

    for j, (campo, titulo) in enumerate(cfg.colunas, 1):
        c = ws.cell(1, j, titulo)
        c.font, c.fill, c.border = Font(bold=True, color="1F1F1F"), _CAB, _BORDA_CAB
        c.alignment = Alignment(horizontal="center", vertical="center")
        ws.column_dimensions[c.column_letter].width = max(_LARGURAS[campo], len(titulo) + 4)
    ws.row_dimensions[1].height = 24
    ws.freeze_panes = "A2"

    i = 1
    for linha in rel.linhas:
        if linha.tipo != "produto" and not cfg.incluir_totais:
            continue
        i += 1
        for j, campo in enumerate(campos, 1):
            c = ws.cell(i, j, _valor(linha, campo))
            c.border = _BORDA
            if linha.tipo == "produto":
                c.font = Font(name="Calibri", size=11)
                if linha.conferir:
                    c.fill = _CONFERIR
            else:
                c.font = Font(bold=linha.tipo != "sub", color="333333")
                c.fill = _PROBLEMA if linha.conferir else (_SUB if linha.tipo == "sub" else _SEC)
            if campo in _NUMERICOS:
                c.number_format = fmt_num
            elif campo == "ean":
                c.number_format = "@"  # EAN é texto: Excel não pode virar 8.41E+12
            if campo not in ("descricao",):
                c.alignment = Alignment(horizontal="center")

    if i > 1:
        ws.auto_filter.ref = f"A1:{ws.cell(1, len(campos)).column_letter}{i}"
    wb.save(caminho)
    return caminho
