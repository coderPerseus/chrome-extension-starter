import {
  LIGHT_READER_DOMAIN_SETTINGS_KEY,
  normalizeLightReaderDomainSettingsMap,
} from "@/shared/light-reader/settings"

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    const stored = await browser.storage.local.get(LIGHT_READER_DOMAIN_SETTINGS_KEY)
    const normalized = normalizeLightReaderDomainSettingsMap(
      stored[LIGHT_READER_DOMAIN_SETTINGS_KEY]
    )
    await browser.storage.local.set({
      [LIGHT_READER_DOMAIN_SETTINGS_KEY]: normalized,
    })
  })
})
