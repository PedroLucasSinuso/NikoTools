"""Roda o fluxo completo (OCR real) no PDF de exemplo, se ele estiver na pasta do projeto."""
from pathlib import Path

import openpyxl
import pytest

from estoque_facil import config, pipeline

PDF = Path(__file__).parent.parent / "amostras" / "estoque.pdf"


@pytest.mark.skipif(not PDF.exists(), reason="PDF de exemplo ausente")
def test_pdf_de_exemplo_gera_planilha_correta(tmp_path):
    cfg = config.carrega(tmp_path)
    cfg.pasta_saida = tmp_path
    res = pipeline.converte(PDF, cfg)
    assert not res.relatorio.avisos
    ws = openpyxl.load_workbook(res.xlsx).active
    assert [c.value for c in ws[1]] == ["Produto", "Descrição do Produto", "Quant", "Mínimo", "Físico", "EAN", "Pedido"]
    assert ws.max_row == 53
    assert ws["C53"].value == 863
