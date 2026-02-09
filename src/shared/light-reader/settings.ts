import { LIGHT_READER_PALETTES } from "@/shared/light-reader/palettes"

export const LIGHT_READER_DOMAIN_SETTINGS_KEY = "light-reader:domain-settings"

export interface LightReaderSettings {
  enabled: boolean
  paletteId: string
}

export type LightReaderDomainSettingsMap = Record<string, LightReaderSettings>

export const DEFAULT_LIGHT_READER_SETTINGS: LightReaderSettings = {
  enabled: false,
  paletteId: LIGHT_READER_PALETTES[0].id,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isValidPaletteId = (paletteId: unknown): paletteId is string =>
  typeof paletteId === "string" && LIGHT_READER_PALETTES.some((palette) => palette.id === paletteId)

export const normalizeDomain = (domain: string) => domain.trim().toLowerCase()

export const normalizeLightReaderSettings = (value: unknown): LightReaderSettings => {
  if (!isRecord(value)) {
    return DEFAULT_LIGHT_READER_SETTINGS
  }

  const enabled =
    typeof value.enabled === "boolean" ? value.enabled : DEFAULT_LIGHT_READER_SETTINGS.enabled
  const paletteId = isValidPaletteId(value.paletteId)
    ? value.paletteId
    : DEFAULT_LIGHT_READER_SETTINGS.paletteId

  return {
    enabled,
    paletteId,
  }
}

export const normalizeLightReaderDomainSettingsMap = (
  value: unknown
): LightReaderDomainSettingsMap => {
  if (!isRecord(value)) {
    return {}
  }

  const nextMap: LightReaderDomainSettingsMap = {}
  for (const [domain, settings] of Object.entries(value)) {
    const normalizedDomain = normalizeDomain(domain)
    if (!normalizedDomain) continue
    nextMap[normalizedDomain] = normalizeLightReaderSettings(settings)
  }

  return nextMap
}

export const getLightReaderSettingsByDomain = (
  mapValue: unknown,
  domain: string
): LightReaderSettings => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain) return DEFAULT_LIGHT_READER_SETTINGS

  const map = normalizeLightReaderDomainSettingsMap(mapValue)
  return map[normalizedDomain] ?? DEFAULT_LIGHT_READER_SETTINGS
}

export const loadLightReaderDomainSettingsMap = async () => {
  const stored = await browser.storage.local.get(LIGHT_READER_DOMAIN_SETTINGS_KEY)
  return normalizeLightReaderDomainSettingsMap(stored[LIGHT_READER_DOMAIN_SETTINGS_KEY])
}

export const loadLightReaderSettingsForDomain = async (domain: string) => {
  const map = await loadLightReaderDomainSettingsMap()
  return map[normalizeDomain(domain)] ?? DEFAULT_LIGHT_READER_SETTINGS
}

export const saveLightReaderSettingsForDomain = async (
  domain: string,
  settings: LightReaderSettings
) => {
  const normalizedDomain = normalizeDomain(domain)
  if (!normalizedDomain) {
    return normalizeLightReaderSettings(settings)
  }

  const next = normalizeLightReaderSettings(settings)
  const currentMap = await loadLightReaderDomainSettingsMap()
  const nextMap: LightReaderDomainSettingsMap = {
    ...currentMap,
    [normalizedDomain]: next,
  }

  await browser.storage.local.set({
    [LIGHT_READER_DOMAIN_SETTINGS_KEY]: nextMap,
  })

  return next
}

export const getDomainFromUrl = (url: string | null | undefined) => {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }

    const domain = normalizeDomain(parsed.hostname)
    return domain || null
  } catch {
    return null
  }
}
