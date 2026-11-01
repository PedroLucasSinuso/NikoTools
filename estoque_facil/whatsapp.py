"""Envio dos prints pelo WhatsApp Web via pywhatkit (opcional, desligado por padrão).

Funciona controlando o navegador padrão: o WhatsApp Web precisa estar logado nele, e durante
o envio o mouse/teclado ficam ocupados. O pywhatkit só envia texto e imagens (não arquivos .xlsx).
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Callable

from .config import Config
from .parser import Relatorio


def destinatario_valido(destino: str) -> bool:
    return bool(re.fullmatch(r"\+\d{10,15}", destino) or re.fullmatch(r"[A-Za-z0-9]{15,}", destino))


def legenda(cfg: Config, rel: Relatorio) -> str:
    try:
        return cfg.whatsapp_mensagem.format(loja=rel.loja, fornecedor=rel.fornecedor, data=rel.data)
    except (KeyError, IndexError, ValueError):
        return cfg.whatsapp_mensagem


def enviar_imagens(cfg: Config, imagens: list[Path], texto: str,
                   progresso: Callable[[int, int], None] | None = None) -> None:
    if not destinatario_valido(cfg.whatsapp_destinatario):
        raise ValueError("Destinatário do WhatsApp inválido. Use o formato +5511999998888 "
                         "(ou o código de um grupo) na seção [whatsapp] do configuracao.ini.")
    # o pywhatkit grava um arquivo de log na pasta atual: manda pra uma pasta nossa
    base = Path(os.environ.get("APPDATA") or Path.home()) / "EstoqueFacil"
    base.mkdir(parents=True, exist_ok=True)
    antes = Path.cwd()
    os.chdir(base)
    try:
        import pywhatkit  # import tardio: só quem usa WhatsApp precisa dele

        for i, img in enumerate(imagens):
            if progresso:
                progresso(i, len(imagens))
            pywhatkit.sendwhats_image(cfg.whatsapp_destinatario, str(img), texto if i == 0 else "",
                                      wait_time=cfg.whatsapp_espera, tab_close=True, close_time=3)
        if progresso:
            progresso(len(imagens), len(imagens))
    finally:
        os.chdir(antes)
