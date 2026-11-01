"""Janela principal. Pensada pra ter poucos botões e nenhum jargão."""
from __future__ import annotations

import os
import queue
import subprocess
import sys
import tempfile
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from . import __version__, config, ocr, pipeline, whatsapp


def abrir(caminho: Path) -> None:
    if sys.platform.startswith("win"):
        os.startfile(caminho)  # type: ignore[attr-defined]
    else:
        subprocess.Popen(["xdg-open", str(caminho)])


def pdf_mais_recente(pasta: Path) -> Path | None:
    pdfs = [p for p in pasta.glob("*.pdf")] if pasta.is_dir() else []
    return max(pdfs, key=lambda p: p.stat().st_mtime, default=None)


class App:
    def __init__(self, cfg: config.Config, pdf_inicial: Path | None = None):
        self.cfg = cfg
        self.fila: queue.Queue = queue.Queue()
        self.ocupado = False
        self.resultado: pipeline.Resultado | None = None

        self.root = tk.Tk()
        self.root.title("Estoque Fácil")
        self.root.geometry("680x540")
        self.root.minsize(560, 460)
        estilo = ttk.Style()
        estilo.configure("Grande.TButton", font=("Segoe UI", 13, "bold"), padding=12)
        estilo.configure("TButton", font=("Segoe UI", 10), padding=6)

        quadro = ttk.Frame(self.root, padding=20)
        quadro.pack(fill="both", expand=True)
        ttk.Label(quadro, text="Estoque Fácil", font=("Segoe UI", 20, "bold")).pack(anchor="w")
        ttk.Label(quadro, font=("Segoe UI", 10), wraplength=620, justify="left",
                  text="Baixe o relatório de estoque do FDC em PDF, escolha o arquivo aqui "
                       "e pronto: a planilha Excel é criada na mesma pasta.").pack(anchor="w", pady=(2, 14))

        self.b_escolher = ttk.Button(quadro, text="Escolher o PDF do estoque…", style="Grande.TButton",
                                     command=self.escolher)
        self.b_escolher.pack(fill="x")
        self.b_recente = ttk.Button(quadro, text="Usar o PDF mais recente da pasta de downloads",
                                    command=self.usar_recente)
        self.b_recente.pack(fill="x", pady=(8, 0))

        self.status = ttk.Label(quadro, text="Aguardando o PDF.", font=("Segoe UI", 10))
        self.status.pack(anchor="w", pady=(16, 4))
        self.barra = ttk.Progressbar(quadro, mode="determinate", maximum=100)
        self.barra.pack(fill="x")

        self.caixa = tk.Text(quadro, height=9, wrap="word", font=("Segoe UI", 10), state="disabled",
                             relief="flat", background="#f4f4f4", padx=10, pady=8)
        self.caixa.pack(fill="both", expand=True, pady=12)
        self.caixa.tag_configure("erro", foreground="#a61c00")
        self.caixa.tag_configure("ok", foreground="#1e7a34")

        botoes = ttk.Frame(quadro)
        botoes.pack(fill="x")
        self.b_planilha = ttk.Button(botoes, text="Abrir planilha", command=lambda: self.abre("xlsx"), state="disabled")
        self.b_planilha.pack(side="left")
        self.b_pasta = ttk.Button(botoes, text="Abrir pasta", command=lambda: self.abre("pasta"), state="disabled")
        self.b_pasta.pack(side="left", padx=8)
        self.b_whats = ttk.Button(botoes, text="Enviar prints no WhatsApp", command=self.enviar_whatsapp, state="disabled")
        if cfg.whatsapp_ativado:
            self.b_whats.pack(side="left")
        ttk.Label(botoes, text=f"v{__version__}", foreground="#888").pack(side="right")

        self.root.after(100, self.processa_fila)
        if pdf_inicial:
            self.root.after(300, lambda: self.converter(pdf_inicial))

    # ---- ações -------------------------------------------------------------
    def escolher(self):
        pasta = self.cfg.pasta_pdf if self.cfg.pasta_pdf.is_dir() else Path.home()
        caminho = filedialog.askopenfilename(title="Escolha o PDF do estoque", initialdir=pasta,
                                             filetypes=[("PDF", "*.pdf"), ("Todos os arquivos", "*.*")])
        if caminho:
            self.converter(Path(caminho))

    def usar_recente(self):
        pdf = pdf_mais_recente(self.cfg.pasta_pdf)
        if not pdf:
            messagebox.showinfo("Estoque Fácil", f"Não achei nenhum PDF na pasta:\n{self.cfg.pasta_pdf}")
        elif messagebox.askyesno("Estoque Fácil", f"Converter este arquivo?\n\n{pdf.name}"):
            self.converter(pdf)

    def abre(self, o_que: str):
        if self.resultado:
            abrir(self.resultado.xlsx if o_que == "xlsx" else self.resultado.xlsx.parent)

    def trava(self, ocupado: bool):
        self.ocupado = ocupado
        estado = "disabled" if ocupado else "normal"
        for b in (self.b_escolher, self.b_recente):
            b.configure(state=estado)

    def escreve(self, texto: str, tag: str = ""):
        self.caixa.configure(state="normal")
        self.caixa.delete("1.0", "end")
        self.caixa.insert("end", texto, tag)
        self.caixa.configure(state="disabled")

    # ---- conversão (thread separada pra janela não congelar) ----------------
    def converter(self, pdf: Path):
        if self.ocupado:
            return
        self.trava(True)
        self.resultado = None
        for b in (self.b_planilha, self.b_pasta, self.b_whats):
            b.configure(state="disabled")
        self.escreve("")
        self.status.configure(text="Lendo o PDF… isso leva alguns instantes.")
        self.barra.configure(mode="indeterminate")
        self.barra.start(15)

        def trabalho():
            try:
                def prog(i, n):
                    self.fila.put(("progresso", i, n))
                self.fila.put(("fim", pipeline.converte(pdf, self.cfg, prog)))
            except Exception as e:  # mostra mensagem amigável, não traceback
                self.fila.put(("erro", e))

        threading.Thread(target=trabalho, daemon=True).start()

    def processa_fila(self):
        try:
            while True:
                msg = self.fila.get_nowait()
                if msg[0] == "progresso":
                    _, i, n = msg
                    self.barra.stop()
                    self.barra.configure(mode="determinate", value=100 * i / max(n, 1))
                    self.status.configure(text=f"Lendo página {min(i + 1, n)} de {n}…" if i < n else "Montando a planilha…")
                elif msg[0] == "fim":
                    self.terminou(msg[1])
                elif msg[0] == "erro":
                    self.falhou(msg[1])
                elif msg[0] == "whats_ok":
                    self.status.configure(text="Prints enviados.")
                    self.trava(False)
                    self.b_whats.configure(state="normal")
                elif msg[0] == "whats_erro":
                    self.status.configure(text="Não consegui enviar pelo WhatsApp.")
                    self.escreve(f"Não consegui enviar pelo WhatsApp:\n{msg[1]}", "erro")
                    self.trava(False)
                    self.b_whats.configure(state="normal")
        except queue.Empty:
            pass
        self.root.after(100, self.processa_fila)

    def terminou(self, res: pipeline.Resultado):
        self.resultado = res
        self.barra.stop()
        self.barra.configure(mode="determinate", value=100)
        self.trava(False)
        ok = not res.relatorio.avisos
        self.status.configure(text="Pronto!" if ok else "Pronto, mas confira antes de enviar.")
        self.escreve(pipeline.resumo(res), "ok" if ok else "erro")
        self.b_planilha.configure(state="normal")
        self.b_pasta.configure(state="normal")
        if self.cfg.whatsapp_ativado:
            self.b_whats.configure(state="normal")
        if self.cfg.abrir_planilha:
            abrir(res.xlsx)

    def falhou(self, erro: Exception):
        self.barra.stop()
        self.barra.configure(mode="determinate", value=0)
        self.trava(False)
        self.status.configure(text="Não deu certo.")
        self.escreve(f"{erro}\n\nSe o problema continuar, mande este PDF pra quem fez o programa.", "erro")

    # ---- WhatsApp ----------------------------------------------------------------
    def enviar_whatsapp(self):
        if not self.resultado or self.ocupado:
            return
        aviso = ("\n\nATENÇÃO: há linhas pra conferir na planilha." if self.resultado.relatorio.avisos else "")
        if not messagebox.askyesno(
                "Enviar no WhatsApp",
                f"Vou enviar os prints do relatório para {self.cfg.whatsapp_destinatario}.\n\n"
                "O WhatsApp Web precisa estar aberto e logado no navegador padrão. Enquanto envia, "
                f"NÃO mexa no mouse nem no teclado.{aviso}\n\nPodemos enviar?"):
            return
        self.trava(True)
        self.b_whats.configure(state="disabled")
        self.status.configure(text="Enviando pelo WhatsApp… não mexa no mouse/teclado.")
        res = self.resultado

        def trabalho():
            try:
                pasta = Path(tempfile.mkdtemp(prefix="estoque_prints_"))
                imagens = ocr.prints_das_paginas(res.pdf, pasta, self.cfg.dpi_print)
                whatsapp.enviar_imagens(self.cfg, imagens, whatsapp.legenda(self.cfg, res.relatorio))
                self.fila.put(("whats_ok",))
            except Exception as e:
                self.fila.put(("whats_erro", e))

        threading.Thread(target=trabalho, daemon=True).start()

    def executa(self):
        self.root.mainloop()


def inicia(pdf: Path | None = None) -> None:
    if sys.platform.startswith("win"):
        try:  # texto nítido em telas com zoom
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass
    try:
        cfg = config.carrega()
    except ValueError as e:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Estoque Fácil", str(e))
        return
    App(cfg, pdf).executa()
