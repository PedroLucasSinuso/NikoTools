import json
from pathlib import Path

from estoque_facil.parser import Caixa, interpreta

FIXTURE = Path(__file__).parent / "fixtures" / "estoque.json"


def carrega():
    paginas = json.loads(FIXTURE.read_text())
    return [[Caixa.de_poligono(b, t, s) for b, t, s in pg] for pg in paginas]


def test_relatorio_exemplo():
    rel = interpreta(carrega())
    prods = rel.produtos
    assert len(prods) == 40
    assert not rel.tem_erro, rel.avisos
    assert sum(p.quant for p in prods) == 863
    assert rel.linhas[-1].tipo == "geral" and rel.linhas[-1].quant == 863
    assert rel.data.startswith("30/10/2026")
    assert "EXEMPLO" in rel.fornecedor
    p = next(p for p in prods if p.produto == "11463")
    assert (p.quant, p.minimo, p.max, p.ean) == (12, 1, 0, "5660199630005")
    assert next(p for p in prods if p.produto == "3722").minimo == 44


def test_soma_que_nao_bate_gera_erro():
    paginas = carrega()
    # corrompe a quantidade de um produto: "59.00" -> "5.00"
    for c in paginas[0]:
        if c.texto == "59.00":
            c.texto = "5.00"
    rel = interpreta(paginas)
    assert rel.tem_erro
    assert any("subseção" in a.texto for a in rel.avisos)


def test_linha_ilegivel_nao_some():
    paginas = carrega()
    for c in paginas[0]:
        if c.texto == "59.00":
            c.texto = "59,0,0"
    rel = interpreta(paginas)
    assert any(l.conferir for l in rel.linhas)
    assert rel.tem_erro
