"""Transforma as caixas de texto do OCR (com posição) nas linhas do relatório.

Não depende de OCR nem de Excel, então dá pra testar só com um JSON de fixture.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from statistics import median

# Abaixo disso a leitura do OCR numa linha de produto é marcada pra conferir.
CONFIANCA_MINIMA = 0.85


@dataclass
class Caixa:
    x0: float
    y0: float
    x1: float
    y1: float
    texto: str
    confianca: float = 1.0

    @classmethod
    def de_poligono(cls, poligono, texto: str, confianca: float = 1.0) -> "Caixa":
        xs = [p[0] for p in poligono]
        ys = [p[1] for p in poligono]
        return cls(min(xs), min(ys), max(xs), max(ys), texto, confianca)

    @property
    def yc(self) -> float:
        return (self.y0 + self.y1) / 2


@dataclass
class Linha:
    """Uma linha do resultado. tipo: produto | sub | secao | geral."""

    tipo: str
    produto: str = ""
    descricao: str = ""
    un: str = ""
    quant: float | None = None
    minimo: float | None = None
    max: float | None = None
    ean: str = ""
    saldo: None = None  # coluna de "Saldo" do PDF é um campo em branco pra preencher
    conferir: bool = False
    nota: str = ""


@dataclass
class Aviso:
    gravidade: str  # "erro" (soma não bate / linha ilegível) ou "atencao"
    texto: str


@dataclass
class Relatorio:
    linhas: list[Linha] = field(default_factory=list)
    avisos: list[Aviso] = field(default_factory=list)
    loja: str = ""
    fornecedor: str = ""
    data: str = ""

    @property
    def produtos(self) -> list[Linha]:
        return [l for l in self.linhas if l.tipo == "produto"]

    @property
    def tem_erro(self) -> bool:
        return any(a.gravidade == "erro" for a in self.avisos)


_NUM = r"-?[\dOol]+[.,][\dOo]{2,3}"
RE_PRODUTO = re.compile(
    rf"^(?P<cod>\d{{1,7}})(?P<inativo>\*)?\s*(?P<desc>.+?)\s+(?P<un>[A-Za-z]{{1,3}})"
    rf"\s+(?P<q>{_NUM})\s+(?P<mi>{_NUM})\s+(?P<mx>{_NUM})"
    r"(?:\s*(?P<ean>[\dOo]{8,14}))?[\W_]*$"
)
RE_TOTAL_SUB = re.compile(r"^total\s*sub\.?\s*se\w*\s*:?\s*(\d+)\s+(-?[\dOol.,]+)\s*$")
RE_TOTAL_SECAO = re.compile(r"^total\s*se\w*\s*:?\s*(\d+)\s+(-?[\dOol.,]+)\s*$")
RE_TOTAL_GERAL = re.compile(r"^total\s*geral\s*:?\s*(-?[\dOol.,]+)\s*$")
RE_SECAO = re.compile(r"^se\w*\s*:\s*(.+)$")
RE_SUBSECAO = re.compile(r"^sub\s*se\w*\s*:\s*(.+)$")


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower().strip()


def _numero(s: str) -> float | None:
    s = s.translate(str.maketrans("OolI", "0011")).strip()
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _limpa_descricao(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    # "75O ML" -> "750 ML": o OCR confunde O e 0 colado em dígitos
    return re.sub(r"(?<=\d)O(?=\d|\s|ML\b|L\b|$)", "0", s)


def agrupa_linhas(caixas: list[Caixa]) -> list[list[Caixa]]:
    """Junta caixas que estão na mesma altura (mesma linha impressa)."""
    if not caixas:
        return []
    tol = 0.6 * median(c.y1 - c.y0 for c in caixas)
    linhas: list[list[Caixa]] = []
    for c in sorted(caixas, key=lambda c: c.yc):
        if linhas and abs(c.yc - sum(x.yc for x in linhas[-1]) / len(linhas[-1])) <= tol:
            linhas[-1].append(c)
        else:
            linhas.append([c])
    return [sorted(l, key=lambda c: c.x0) for l in linhas]


def interpreta(paginas: list[list[Caixa]]) -> Relatorio:
    rel = Relatorio()
    secao = sub = ""
    soma_sub = soma_secao = soma_geral = 0.0
    erro_na_sub = erro_na_secao = False

    def confere(rotulo: str, esperado: float | None, lido: float) -> bool:
        if esperado is None:
            rel.avisos.append(Aviso("atencao", f"{rotulo}: não consegui ler o total do relatório."))
            return False
        if abs(esperado - lido) > 0.005:
            rel.avisos.append(Aviso(
                "erro",
                f"{rotulo}: o relatório diz {esperado:g}, mas a soma dos produtos lidos deu "
                f"{lido:g} (diferença {lido - esperado:+g}). Algum produto pode ter sido lido errado ou ficado de fora."))
            return False
        return True

    for n_pag, caixas in enumerate(paginas, 1):
        for linha in agrupa_linhas(caixas):
            texto = re.sub(r"\s+", " ", " ".join(c.texto for c in linha)).strip()
            t = _norm(texto)
            if not t:
                continue

            if m := re.search(r"data\s*:\s*(\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)", t):
                rel.data = rel.data or m.group(1)
                continue
            if t.startswith("pagina") or t.startswith("* :"):
                continue
            if t.startswith("produto") and "saldo" in t:
                continue
            if "relatorio de saldos" in t:
                m = re.search(r"\(\s*\d+\s*-\s*(.+?)\)?\s*$", texto)
                rel.fornecedor = rel.fornecedor or (m.group(1).strip() if m else "")
                continue
            if re.match(r"^\d+\s*-\s*[a-z]", t) and not RE_PRODUTO.match(texto) and not rel.loja and not rel.linhas:
                rel.loja = texto
                continue

            if m := RE_TOTAL_SUB.match(t):
                lido = _numero(m.group(2))
                ok = confere(f"Total da subseção {sub or m.group(1)}", lido, soma_sub)
                rel.linhas.append(Linha("sub", descricao=f"Total Sub. Seção: {m.group(1)}", quant=lido,
                                        conferir=not ok, nota="" if ok else "soma não bate"))
                erro_na_sub = erro_na_secao = erro_na_secao or not ok
                soma_sub = 0.0
                continue
            if m := RE_TOTAL_SECAO.match(t):
                lido = _numero(m.group(2))
                ok = True
                if not erro_na_secao:
                    ok = confere(f"Total da seção {secao or m.group(1)}", lido, soma_secao)
                rel.linhas.append(Linha("secao", descricao=f"Total Seção: {m.group(1)}", quant=lido,
                                        conferir=not ok, nota="" if ok else "soma não bate"))
                soma_secao = 0.0
                erro_na_sub = erro_na_secao = False
                continue
            if m := RE_TOTAL_GERAL.match(t):
                lido = _numero(m.group(1))
                ok = True
                if not any(a.gravidade == "erro" for a in rel.avisos):
                    ok = confere("Total geral", lido, soma_geral)
                rel.linhas.append(Linha("geral", descricao="Total Geral", quant=lido,
                                        conferir=not ok, nota="" if ok else "soma não bate"))
                continue
            if m := RE_SUBSECAO.match(t):
                sub = texto.split(":", 1)[1].strip()
                continue
            if m := RE_SECAO.match(t):
                secao = texto.split(":", 1)[1].strip()
                continue

            if m := RE_PRODUTO.match(texto):
                q, mi, mx = (_numero(m.group(k)) for k in ("q", "mi", "mx"))
                ean = (m.group("ean") or "").translate(str.maketrans("Oo", "00"))
                desc = _limpa_descricao(m.group("desc")) + (" *" if m.group("inativo") else "")
                notas = []
                if min(c.confianca for c in linha) < CONFIANCA_MINIMA:
                    notas.append("leitura com baixa confiança")
                if ean and len(ean) not in (8, 12, 13, 14):
                    notas.append(f"EAN com {len(ean)} dígitos")
                if q is None:
                    notas.append("quantidade ilegível")
                prod = Linha("produto", produto=m.group("cod"), descricao=desc, un=m.group("un").upper(),
                             quant=q, minimo=mi, max=mx, ean=ean, conferir=bool(notas), nota="; ".join(notas))
                rel.linhas.append(prod)
                if notas:
                    rel.avisos.append(Aviso("atencao", f"Produto {prod.produto} ({desc}): {prod.nota}."))
                soma_sub += q or 0.0
                soma_secao += q or 0.0
                soma_geral += q or 0.0
                continue

            # Começa com código e tem cara de produto, mas não bateu no padrão: não perde, marca.
            if re.match(r"^\d{3,}", t) and re.search(r"\d[.,]\d{2}", t):
                rel.linhas.append(Linha("produto", produto=texto.split()[0], descricao=texto, conferir=True,
                                        nota="linha não reconhecida"))
                rel.avisos.append(Aviso("erro", f"Página {n_pag}: não consegui separar as colunas desta linha: \"{texto}\"."))
                erro_na_sub = erro_na_secao = True
    return rel
