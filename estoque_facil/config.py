"""Configuração em arquivo .ini (editável no Bloco de Notas) ao lado do programa."""
from __future__ import annotations

import configparser
import sys
from dataclasses import dataclass, field
from pathlib import Path

NOME_ARQUIVO = "configuracao.ini"

PADRAO = """\
; Configuração do Estoque Fácil.
; Pode editar com o Bloco de Notas. Linhas que começam com ";" são comentários.
; Se estragar alguma coisa, apague este arquivo: o programa cria um novo.

[geral]
; Pasta onde o programa procura o PDF. Vazio = pasta Downloads.
pasta_pdf =
; Pasta onde salvar a planilha. Vazio = na mesma pasta do PDF.
pasta_saida =
; Abrir a planilha sozinha quando terminar? (sim/nao)
abrir_planilha = sim

[planilha]
nome_da_aba = ESTOQUE
; Colunas, na ordem em que aparecem. Formato  campo:Título
; Campos disponíveis: produto, descricao, un, quant, minimo, max, ean, saldo
; Para tirar uma coluna, apague da lista. Para renomear, mude o que vem depois dos ":".
colunas = produto:Produto, descricao:Descrição do Produto, quant:Quant, minimo:Mínimo, max:Físico, ean:EAN, saldo:Pedido
; Incluir as linhas de "Total Sub. Seção", "Total Seção" e "Total Geral"? (sim/nao)
incluir_totais = sim
; Casas decimais mostradas nas quantidades (0 = 59, 2 = 59.00)
casas_decimais = 2

[ocr]
; Qualidade da leitura. 200 é um bom equilíbrio; 250 lê melhor letras miúdas, mas demora mais.
dpi = 200

[whatsapp]
; Enviar os prints do relatório pelo WhatsApp depois de converter? (sim/nao)
ativado = nao
; Número com código do país (ex.: +5511999998888) ou o código de um grupo.
destinatario =
; Texto que acompanha a primeira imagem. Pode usar {loja}, {fornecedor} e {data}.
mensagem = Estoque {fornecedor} - {data}
; Qualidade dos prints (dpi). 110 deixa legível e leve.
dpi_print = 110
; Segundos de espera pro WhatsApp Web abrir/carregar antes de colar cada imagem.
espera_segundos = 20
"""

CAMPOS = ("produto", "descricao", "un", "quant", "minimo", "max", "ean", "saldo")


def pasta_do_programa() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def pasta_downloads() -> Path:
    return Path.home() / "Downloads"


@dataclass
class Config:
    pasta_pdf: Path = field(default_factory=pasta_downloads)
    pasta_saida: Path | None = None
    abrir_planilha: bool = True
    nome_da_aba: str = "ESTOQUE"
    colunas: list[tuple[str, str]] = field(default_factory=list)
    incluir_totais: bool = True
    casas_decimais: int = 2
    dpi: int = 200
    whatsapp_ativado: bool = False
    whatsapp_destinatario: str = ""
    whatsapp_mensagem: str = "Estoque {fornecedor} - {data}"
    dpi_print: int = 110
    whatsapp_espera: int = 20


def _sim(valor: str) -> bool:
    return valor.strip().lower() in ("sim", "s", "1", "true", "yes", "verdadeiro")


def carrega(pasta: Path | None = None) -> Config:
    pasta = pasta or pasta_do_programa()
    caminho = pasta / NOME_ARQUIVO
    if not caminho.exists():
        try:
            caminho.write_text(PADRAO, encoding="utf-8-sig")
        except OSError:
            pass  # pasta sem permissão de escrita: segue com os padrões

    ini = configparser.ConfigParser(inline_comment_prefixes=None, interpolation=None)
    ini.read_string(PADRAO)  # padrões
    if caminho.exists():
        try:
            ini.read(caminho, encoding="utf-8-sig")
        except configparser.Error as e:
            raise ValueError(f"O arquivo {NOME_ARQUIVO} está com problema ({e}). "
                             "Apague-o para o programa criar um novo.") from e

    g, p, o, w = ini["geral"], ini["planilha"], ini["ocr"], ini["whatsapp"]
    colunas = []
    for item in p["colunas"].split(","):
        campo, _, titulo = item.partition(":")
        campo = campo.strip().lower()
        if campo not in CAMPOS:
            raise ValueError(f"Coluna desconhecida em {NOME_ARQUIVO}: \"{campo}\". Use: {', '.join(CAMPOS)}.")
        colunas.append((campo, titulo.strip() or campo.capitalize()))

    def inteiro(secao, chave, minimo, maximo):
        try:
            v = int(secao[chave])
        except ValueError:
            raise ValueError(f"\"{chave}\" em {NOME_ARQUIVO} precisa ser um número.") from None
        return max(minimo, min(maximo, v))

    return Config(
        pasta_pdf=Path(g["pasta_pdf"].strip()).expanduser() if g["pasta_pdf"].strip() else pasta_downloads(),
        pasta_saida=Path(g["pasta_saida"].strip()).expanduser() if g["pasta_saida"].strip() else None,
        abrir_planilha=_sim(g["abrir_planilha"]),
        nome_da_aba=p["nome_da_aba"].strip()[:31] or "ESTOQUE",
        colunas=colunas,
        incluir_totais=_sim(p["incluir_totais"]),
        casas_decimais=inteiro(p, "casas_decimais", 0, 3),
        dpi=inteiro(o, "dpi", 100, 400),
        whatsapp_ativado=_sim(w["ativado"]),
        whatsapp_destinatario=w["destinatario"].strip(),
        whatsapp_mensagem=w["mensagem"],
        dpi_print=inteiro(w, "dpi_print", 60, 200),
        whatsapp_espera=inteiro(w, "espera_segundos", 5, 120),
    )
