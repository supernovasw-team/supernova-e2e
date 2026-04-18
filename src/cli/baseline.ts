import kleur from 'kleur'

export async function baseline(action: string): Promise<void> {
  console.log(kleur.cyan(`baseline ${action} — stub`))
}
