import { execa } from 'execa'
import kleur from 'kleur'
import { buildReport } from '../post/report.js'

export async function report(opts: { open?: boolean }): Promise<void> {
  const htmlPath = await buildReport()
  console.log(kleur.green(`Report: ${htmlPath}`))
  if (opts.open) {
    await execa('open', [htmlPath], { stdio: 'inherit' })
  }
}
