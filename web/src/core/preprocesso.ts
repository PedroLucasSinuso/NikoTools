/**
 * Limpa a imagem da página antes do OCR: o relatório vem com grade de linhas e faixas cinzas que
 * confundem a análise de layout do Tesseract (ele passava a ler só ~2/3 dos produtos).
 * Opera direto nos pixels RGBA, então roda igual no navegador e em Node (testes).
 */
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Linhas de tabela têm centenas de pixels seguidos; letras nunca passam de ~40. */
const COMPRIMENTO_LINHA = 150
/** Tom a partir do qual o pixel vira fundo: apaga as faixas cinzas de seção. */
const CLARO = 200
/** Tom abaixo do qual o pixel conta como "tinta" ao procurar linhas. */
const ESCURO = 170

export function limpaPagina({ data, width: w, height: h }: Pixels): void {
  const cinza = new Uint8ClampedArray(w * h)
  for (let i = 0; i < cinza.length; i++) {
    const g = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    cinza[i] = g
  }
  const apaga = new Uint8Array(w * h)

  const marca = (inicio: number, passo: number, n: number) => {
    let run = 0
    for (let k = 0; k <= n; k++) {
      const escuro = k < n && cinza[inicio + k * passo] < ESCURO
      if (escuro) run++
      else {
        if (run >= COMPRIMENTO_LINHA) for (let j = k - run; j < k; j++) apaga[inicio + j * passo] = 1
        run = 0
      }
    }
  }
  for (let y = 0; y < h; y++) marca(y * w, 1, w) // horizontais
  for (let x = 0; x < w; x++) marca(x, w, h) // verticais

  // engrossa 1px a marcação pra pegar a borda suave (antialiasing) das linhas
  const final = new Uint8Array(apaga)
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!apaga[i] && (apaga[i - 1] || apaga[i + 1] || apaga[i - w] || apaga[i + w]) && cinza[i] < CLARO) final[i] = 1
    }

  for (let i = 0; i < cinza.length; i++) {
    const v = final[i] || cinza[i] > CLARO ? 255 : cinza[i]
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
}
