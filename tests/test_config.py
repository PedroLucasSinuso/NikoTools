import pytest

from estoque_facil import config


def test_cria_arquivo_e_le_padroes(tmp_path):
    cfg = config.carrega(tmp_path)
    assert (tmp_path / config.NOME_ARQUIVO).exists()
    assert [c for c, _ in cfg.colunas] == ["produto", "descricao", "quant", "minimo", "max", "ean", "saldo"]
    assert dict(cfg.colunas)["max"] == "Físico" and dict(cfg.colunas)["saldo"] == "Pedido"
    assert cfg.whatsapp_ativado is False


def test_coluna_invalida_da_erro_claro(tmp_path):
    (tmp_path / config.NOME_ARQUIVO).write_text("[planilha]\ncolunas = produto:A, xyz:B\n", encoding="utf-8")
    with pytest.raises(ValueError, match="xyz"):
        config.carrega(tmp_path)
