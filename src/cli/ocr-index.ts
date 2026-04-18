import kleur from 'kleur'
import { resolve } from 'node:path'
import { extractTextFromAll } from '../post/ocr.js'

export async function ocrIndex(): Promise<void> {
  const screenshotsDir = resolve(process.cwd(), '.artifacts/screenshots')
  const outDir = resolve(process.cwd(), '.artifacts/ocr')

  console.log(kleur.cyan('▶ ocr-index — extracting text from all screenshots…'))
  const index = await extractTextFromAll(screenshotsDir, outDir)
  const count = Object.keys(index).length
  console.log(kleur.green(`  ✓ OCR indexed ${count} screenshot${count !== 1 ? 's' : ''} → ${outDir}/index.json`))
}
