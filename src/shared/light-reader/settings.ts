import { LIGHT_READER_PALETTES } from "@/shared/light-reader/palettes"

export const LIGHT_READER_SETTINGS_KEY = "light-reader:settings"

export interface LightReaderSettings {
  enabled: boolean
  paletteId: string
}

export const DEFAULT_LIGHT_READER_SETTINGS: LightReaderSettings = {
  enabled: false,
  paletteId: LIGHT_READER_PALETTES[0].id,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isValidPaletteId = (paletteId: unknown): paletteId is string =>
  typeof paletteId === "string" &&
  LIGHT_READER_PALETTES.some((palette) => palette.id === paletteId)

export const normalizeLightReaderSettings = (value: unknown): LightReaderSettings => {
  if (!isRecord(value)) {
    return DEFAULT_LIGHT_READER_SETTINGS
  }

  const enabled = typeof value.enabled === "boolean" ? value.enabled : DEFAULT_LIGHT_READER_SETTINGS.enabled
  const paletteId = isValidPaletteId(value.paletteId)
    ? value.paletteId
    : DEFAULT_LIGHT_READER_SETTINGS.paletteId

  return {
    enabled,
    paletteId,
  }
}

export const loadLightReaderSettings = async () => {
  const stored = await browser.storage.local.get(LIGHT_READER_SETTINGS_KEY)
  return normalizeLightReaderSettings(stored[LIGHT_READER_SETTINGS_KEY])
}

export const saveLightReaderSettings = async (settings: LightReaderSettings) => {
  const next = normalizeLightReaderSettings(settings)
  await browser.storage.local.set({
    [LIGHT_READER_SETTINGS_KEY]: next,
  })
  return next
}
