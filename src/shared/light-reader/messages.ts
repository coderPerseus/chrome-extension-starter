import type { LightReaderSettings } from "@/shared/light-reader/settings"

export const LIGHT_READER_UPDATE_MESSAGE = "light-reader:update"

export interface LightReaderUpdateMessage {
  type: typeof LIGHT_READER_UPDATE_MESSAGE
  domain: string
  settings: LightReaderSettings
}

export const isLightReaderUpdateMessage = (value: unknown): value is LightReaderUpdateMessage => {
  if (typeof value !== "object" || value === null) return false
  if (!("type" in value) || value.type !== LIGHT_READER_UPDATE_MESSAGE) return false
  if (!("domain" in value) || typeof value.domain !== "string") return false
  return "settings" in value
}
