/** Fica separado do xlsx.ts pra não puxar o ExcelJS (pesado) junto no carregamento inicial. */
export function nomeDoArquivo(pdf: string): string {
  return pdf.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]/g, ' ').trim() + '.xlsx'
}
