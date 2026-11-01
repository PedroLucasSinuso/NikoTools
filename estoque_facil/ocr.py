"""PDF -> imagem -> OCR (RapidOCR, modelo latino/português, roda 100% offline)."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable

import numpy as np
import pymupdf

from .parser import Caixa

_motor = None
MODELO_REC = "latin_PP-OCRv5_rec_mobile.onnx"


def _prepara_saidas_padrao() -> None:
    # Em app "sem console" (PyInstaller --windowed) stdout/stderr são None e o logging do OCR quebra.
    import os
    for nome in ("stdout", "stderr"):
        if getattr(sys, nome) is None:
            setattr(sys, nome, open(os.devnull, "w"))


def _motor_ocr():
    global _motor
    if _motor is None:
        _prepara_saidas_padrao()
        import rapidocr
        from rapidocr import LangRec, ModelType, OCRVersion, RapidOCR

        params = {
            "Global.use_cls": False,  # as páginas já saem retas do PDF
            "Global.log_level": "error",
            "Rec.lang_type": LangRec.LATIN,
            "Rec.ocr_version": OCRVersion.PPOCRV5,
            "Rec.model_type": ModelType.MOBILE,
        }
        local = Path(rapidocr.__file__).parent / "models" / MODELO_REC
        if local.exists():  # empacotado no .exe: nunca tenta baixar nada
            params["Rec.model_path"] = str(local)
        _motor = RapidOCR(params=params)
    return _motor


def renderiza_pagina(pagina: pymupdf.Page, dpi: int) -> np.ndarray:
    pix = pagina.get_pixmap(dpi=dpi, alpha=False)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, 3)


def le_pdf(caminho: Path, dpi: int = 200, progresso: Callable[[int, int], None] | None = None) -> list[list[Caixa]]:
    """Devolve, por página, as caixas de texto lidas (com posição e confiança)."""
    try:
        doc = pymupdf.open(caminho)
    except Exception as e:
        raise ValueError(f"Não consegui abrir o PDF ({e}).") from e
    if doc.needs_pass:
        raise ValueError("Este PDF tem senha.")
    motor = _motor_ocr()
    paginas = []
    for i, pagina in enumerate(doc):
        if progresso:
            progresso(i, len(doc))
        r = motor(renderiza_pagina(pagina, dpi))
        caixas = []
        if r.boxes is not None:
            for box, txt, score in zip(r.boxes, r.txts, r.scores):
                caixas.append(Caixa.de_poligono(box, txt, float(score)))
        paginas.append(caixas)
    if progresso:
        progresso(len(doc), len(doc))
    return paginas


def prints_das_paginas(caminho: Path, pasta: Path, dpi: int = 110) -> list[Path]:
    """Salva cada página do PDF como PNG (os 'prints' pro WhatsApp)."""
    pasta.mkdir(parents=True, exist_ok=True)
    saida = []
    with pymupdf.open(caminho) as doc:
        for i, pagina in enumerate(doc, 1):
            destino = pasta / f"{caminho.stem}_pagina{i}.png"
            pagina.get_pixmap(dpi=dpi, alpha=False).save(destino)
            saida.append(destino)
    return saida
