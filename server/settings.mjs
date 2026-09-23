// Per-user workspace settings: appearance plus the AI provider credentials that used
// to be env-only. Everything here is pure so the merge/mask/resolve rules can be tested
// without a database, and secrets never leave the server in cleartext.
export const SETTING_DEFAULTS = {
  theme: 'light',
  textSize: 'default',
  opencodeBaseUrl: '',
  opencodeModel: '',
  groqWhisperModel: '',
  hindsightUrl: '',
  hindsightBank: '',
}

export const SECRET_SETTINGS = ['opencodeApiKey', 'groqApiKey', 'hindsightApiKey']

export const TEXT_SIZES = ['small', 'default', 'large', 'xlarge']
export const THEMES = ['light', 'dark']

const KNOWN_KEYS = [...Object.keys(SETTING_DEFAULTS), ...SECRET_SETTINGS]
const MAX_VALUE_LENGTH = 400

const clean = value => String(value ?? '').trim().slice(0, MAX_VALUE_LENGTH)

export function mergeSettings(current = {}, patch = {}) {
  const next = { ...current }
  for (const key of KNOWN_KEYS) {
    if (!(key in patch)) continue
    const value = patch[key]
    // null clears a stored value, an empty string leaves it untouched, so a masked
    // secret can round-trip through a settings form without being wiped.
    if (value === null) { delete next[key]; continue }
    const text = clean(value)
    if (text) next[key] = text
  }
  if (next.textSize && !TEXT_SIZES.includes(next.textSize)) delete next.textSize
  if (next.theme && !THEMES.includes(next.theme)) delete next.theme
  return next
}

export function publicSettings(settings = {}) {
  const out = { ...SETTING_DEFAULTS, ...settings }
  for (const key of SECRET_SETTINGS) {
    out[`${key}Set`] = Boolean(settings[key])
    out[key] = ''
  }
  return out
}

const pick = (value, fallback = '') => clean(value) || clean(fallback)

export function resolveProviderConfig(settings = {}, env = {}) {
  return {
    opencode: {
      apiKey: pick(settings.opencodeApiKey, env.OPENCODE_API_KEY),
      baseUrl: pick(settings.opencodeBaseUrl, env.OPENCODE_BASE_URL) || 'https://api.opencode.ai/v1',
      model: pick(settings.opencodeModel, env.OPENCODE_MODEL) || 'opencode-go',
    },
    groq: {
      apiKey: pick(settings.groqApiKey, env.GROQ_API_KEY),
      whisperModel: pick(settings.groqWhisperModel, env.GROQ_WHISPER_MODEL) || 'whisper-large-v3-turbo',
    },
    hindsight: {
      url: pick(settings.hindsightUrl, env.HINDSIGHT_URL),
      apiKey: pick(settings.hindsightApiKey, env.HINDSIGHT_API_KEY),
      bank: pick(settings.hindsightBank, env.HINDSIGHT_BANK) || 'tadoo',
    },
  }
}

export function providerStatus(settings = {}, env = {}) {
  const config = resolveProviderConfig(settings, env)
  return {
    opencode: Boolean(config.opencode.apiKey),
    groq: Boolean(config.groq.apiKey),
    hindsight: Boolean(config.hindsight.url),
    opencodeSource: settings.opencodeApiKey ? 'workspace' : env.OPENCODE_API_KEY ? 'server' : 'none',
    groqSource: settings.groqApiKey ? 'workspace' : env.GROQ_API_KEY ? 'server' : 'none',
    hindsightSource: settings.hindsightUrl ? 'workspace' : env.HINDSIGHT_URL ? 'server' : 'none',
  }
}
