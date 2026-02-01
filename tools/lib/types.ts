export interface TalonLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warning' | 'error'
  message: string
  source?: string
}

export interface TalonConfig {
  talonHome: string
  logPath: string
  userPath: string
}

export interface ReplResult {
  success: boolean
  output: string
  error?: string
}

export interface TalonStatus {
  running: boolean
  version?: string
  activeContext?: string
  loadedModules?: number
}
