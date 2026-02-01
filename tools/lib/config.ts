import { homedir } from 'node:os'
import { join } from 'node:path'
import type { TalonConfig } from './types'

export function getTalonConfig(): TalonConfig {
  const home = homedir()
  const talonHome = process.env.TALON_HOME || join(home, '.talon')

  return {
    talonHome,
    logPath: join(talonHome, 'talon.log'),
    userPath: join(talonHome, 'user'),
  }
}

export function getTalonHome(): string {
  return getTalonConfig().talonHome
}
