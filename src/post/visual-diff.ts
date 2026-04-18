import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { glob } from 'node:fs/promises'

export type DiffStatus = 'match' | 'changed' | 'no-baseline'

export interface DiffResult {
  path: string          // relative path (e.g. "backoffice/login.png")
  status: DiffStatus
  diffPixels?: number
  totalPixels?: number
  diffRatio?: number
  thresholdExceeded?: boolean
}

/**
 * Compare every PNG in `screenshotsDir` against its counterpart in `baselineDir`.
 * - Missing baseline → status 'no-baseline', image copied as candidate (not promoted).
 * - Existing baseline → pixelmatch; if diffPixels/total > threshold, write diff PNG to outDir.
 * Writes `<outDir>/index.json` and returns the full DiffResult[].
 */
export async function diffAgainstBaseline(
  screenshotsDir: string,
  baselineDir: string,
  outDir: string,
  threshold: number,
): Promise<DiffResult[]> {
  const screenshots = resolve(screenshotsDir)
  const baseline = resolve(baselineDir)
  const out = resolve(outDir)

  const results: DiffResult[] = []

  const pngPaths: string[] = []
  for await (const entry of glob(`${screenshots}/**/*.png`)) {
    // Skip the _baseline dir itself if nested
    if (entry.includes('/_baseline/')) continue
    pngPaths.push(entry)
  }

  for (const absPath of pngPaths) {
    const relPath = relative(screenshots, absPath)
    const baselinePath = resolve(baseline, relPath)

    if (!existsSync(baselinePath)) {
      // Copy as candidate (informational — not a promotion)
      const candidateDest = resolve(out, '_candidates', relPath)
      mkdirSync(dirname(candidateDest), { recursive: true })
      copyFileSync(absPath, candidateDest)
      results.push({ path: relPath, status: 'no-baseline' })
      continue
    }

    let currentPng: PNG
    let baselinePng: PNG
    try {
      currentPng = PNG.sync.read(readFileSync(absPath))
      baselinePng = PNG.sync.read(readFileSync(baselinePath))
    } catch (err) {
      results.push({
        path: relPath,
        status: 'changed',
        diffPixels: 0,
        totalPixels: 0,
        diffRatio: 0,
        thresholdExceeded: false,
      })
      continue
    }

    // Normalise dimensions — pixelmatch requires identical sizes
    const width = Math.max(currentPng.width, baselinePng.width)
    const height = Math.max(currentPng.height, baselinePng.height)
    const totalPixels = width * height

    const normCurrent = normaliseDimensions(currentPng, width, height)
    const normBaseline = normaliseDimensions(baselinePng, width, height)
    const diffPng = new PNG({ width, height })

    const diffPixels = pixelmatch(
      normCurrent,
      normBaseline,
      diffPng.data,
      width,
      height,
      { threshold: 0.1 },
    )

    const diffRatio = totalPixels > 0 ? diffPixels / totalPixels : 0
    const thresholdExceeded = diffRatio > threshold

    if (thresholdExceeded) {
      const diffOut = resolve(out, relPath)
      mkdirSync(dirname(diffOut), { recursive: true })
      writeFileSync(diffOut, PNG.sync.write(diffPng))
    }

    results.push({
      path: relPath,
      status: diffPixels === 0 ? 'match' : 'changed',
      diffPixels,
      totalPixels,
      diffRatio,
      thresholdExceeded,
    })
  }

  mkdirSync(out, { recursive: true })
  writeFileSync(resolve(out, 'index.json'), JSON.stringify(results, null, 2))
  return results
}

/**
 * Return the RGBA buffer of `png` padded (with transparent pixels) to `width × height`.
 * Returns the original data buffer when dimensions already match.
 */
function normaliseDimensions(png: PNG, width: number, height: number): Buffer {
  if (png.width === width && png.height === height) return png.data as Buffer

  const padded = Buffer.alloc(width * height * 4, 0)
  for (let row = 0; row < png.height && row < height; row++) {
    const srcOffset = row * png.width * 4
    const dstOffset = row * width * 4
    const bytesToCopy = Math.min(png.width, width) * 4
    png.data.copy(padded, dstOffset, srcOffset, srcOffset + bytesToCopy)
  }
  return padded
}
