"""Ponto de entrada. Arrastar um PDF em cima do .exe já converte direto."""
import sys
from pathlib import Path

from . import gui


def main() -> None:
    pdf = next((Path(a) for a in sys.argv[1:] if a.lower().endswith(".pdf")), None)
    gui.inicia(pdf)


if __name__ == "__main__":
    main()
