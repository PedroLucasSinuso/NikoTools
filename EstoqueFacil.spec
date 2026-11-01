# -*- mode: python ; coding: utf-8 -*-
# Build:  pyinstaller EstoqueFacil.spec --noconfirm
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Modelos .onnx e config.yaml do rapidocr, menos o reconhecedor padrão (chinês) e o classificador de
# ângulo, que não usamos: o app só usa o detector + o reconhecedor latino.
NAO_USADOS = ("PP-OCRv6_rec_small.onnx", "ch_ppocr_mobile_v2.0_cls_mobile.onnx")
datas = [d for d in collect_data_files("rapidocr") if not d[0].endswith(NAO_USADOS)]
hidden = collect_submodules("rapidocr") + ["pywhatkit"]

a = Analysis(
    ["estoque_facil.py"],
    pathex=["."],
    datas=datas,
    hiddenimports=hidden,
    excludes=["pymupdf.layout", "pymupdf_layout", "pymupdf4llm", "matplotlib", "scipy", "pandas", "IPython", "notebook", "torch", "PyQt5", "PyQt6", "PySide6"],
)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name="EstoqueFacil", console=False)
coll = COLLECT(exe, a.binaries, a.datas, name="EstoqueFacil")
