"""Baixa (uma vez) os modelos de OCR pra dentro do pacote rapidocr, antes de empacotar o .exe."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from estoque_facil import ocr

motor = ocr._motor_ocr()
motor(np.full((64, 256, 3), 255, dtype=np.uint8))
print("modelos prontos")
