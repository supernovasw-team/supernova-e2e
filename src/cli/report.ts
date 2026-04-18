import kleur from 'kleur'

export async function report(_opts: { open?: boolean }): Promise<void> {
  console.log(kleur.cyan('report — stub (will serve HTML index of latest run)'))
}
