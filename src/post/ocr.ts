import { createWorker } from 'tesseract.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { glob } from 'node:fs/promises'

/**
 * Extract text from all PNGs under `rootDir` using tesseract.js.
 * Writes a `.txt` for each image into the mirrored path under `outDir`,
 * and writes `<outDir>/index.json` keyed by relative path.
 *
 * A single worker is reused across all files to avoid the ~10s init overhead.
 */
export async function extractTextFromAll(
  rootDir: string,
  outDir: string,
): Promise<Record<string, string>> {
  const root = resolve(rootDir)
  const out = resolve(outDir)

  // Collect all PNGs
  const pngPaths: string[] = []
  for await (const entry of glob(`${root}/**/*.png`)) {
    // Skip baseline directory
    if (entry.includes('/_baseline/')) continue
    pngPaths.push(entry)
  }

  const index: Record<string, string> = {}

  if (pngPaths.length === 0) {
    mkdirSync(out, { recursive: true })
    writeFileSync(resolve(out, 'index.json'), JSON.stringify(index, null, 2))
    return index
  }

  // Try por+eng; fall back to eng only if por fails to initialise
  let worker: Awaited<ReturnType<typeof createWorker>>
  let lang = 'por+eng'
  try {
    worker = await createWorker(lang)
  } catch {
    lang = 'eng'
    worker = await createWorker(lang)
  }

  try {
    for (const absPath of pngPaths) {
      const relPath = relative(root, absPath) // e.g. "backoffice/login.png"
      let text = ''
      try {
        const { data } = await worker.recognize(absPath)
        text = data.text.trim()
      } catch (err) {
        text = `[OCR error: ${err instanceof Error ? err.message : String(err)}]`
      }

      // Write .txt mirror
      const txtOut = resolve(out, relPath.replace(/\.png$/i, '.txt'))
      mkdirSync(dirname(txtOut), { recursive: true })
      writeFileSync(txtOut, text, 'utf-8')

      index[relPath] = text
    }
  } finally {
    await worker.terminate()
  }

  mkdirSync(out, { recursive: true })
  writeFileSync(resolve(out, 'index.json'), JSON.stringify(index, null, 2))
  return index
}
