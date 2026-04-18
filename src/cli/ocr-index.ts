import kleur from 'kleur'

export async function ocrIndex(): Promise<void> {
  console.log(kleur.cyan('ocr-index — stub (will tesseract every PNG in .artifacts/screenshots/)'))
}
