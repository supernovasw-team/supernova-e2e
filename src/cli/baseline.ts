import kleur from 'kleur'
import { resolve } from 'node:path'
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { dirname, relative } from 'node:path'

const SCREENSHOTS_DIRS = ['backoffice', 'app']

export async function baseline(action: string): Promise<void> {
  const artifactsDir = resolve(process.cwd(), '.artifacts/screenshots')
  const baselineDir = resolve(artifactsDir, '_baseline')

  if (action === 'update') {
    console.log(kleur.cyan('▶ baseline update — copying current screenshots into _baseline/…'))
    let count = 0
    for (const sub of SCREENSHOTS_DIRS) {
      const srcDir = resolve(artifactsDir, sub)
      if (!existsSync(srcDir)) continue
      for await (const absPath of glob(`${srcDir}/**/*.png`)) {
        const relPath = relative(artifactsDir, absPath) // e.g. "backoffice/login.png"
        const dest = resolve(baselineDir, relPath)
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(absPath, dest)
        count++
      }
    }
    console.log(kleur.green(`  ✓ baseline updated — ${count} file${count !== 1 ? 's' : ''} in ${baselineDir}`))
    return
  }

  if (action === 'clear') {
    console.log(kleur.cyan('▶ baseline clear — removing all files under _baseline/…'))
    if (existsSync(baselineDir)) {
      rmSync(baselineDir, { recursive: true, force: true })
      console.log(kleur.green(`  ✓ baseline cleared (${baselineDir} removed)`))
    } else {
      console.log(kleur.gray('  (no baseline directory found — nothing to clear)'))
    }
    return
  }

  console.error(kleur.red(`Unknown baseline action: "${action}". Valid: update | clear`))
  process.exit(1)
}
