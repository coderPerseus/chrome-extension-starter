import {
  DEFAULT_LIGHT_READER_SETTINGS,
  LIGHT_READER_SETTINGS_KEY,
  normalizeLightReaderSettings,
} from "@/shared/light-reader/settings"

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    const stored = await browser.storage.local.get(LIGHT_READER_SETTINGS_KEY)
    const normalized = normalizeLightReaderSettings(stored[LIGHT_READER_SETTINGS_KEY])

    if (stored[LIGHT_READER_SETTINGS_KEY]) {
      await browser.storage.local.set({ [LIGHT_READER_SETTINGS_KEY]: normalized })
      return
    }

    await browser.storage.local.set({
      [LIGHT_READER_SETTINGS_KEY]: DEFAULT_LIGHT_READER_SETTINGS,
    })
  })
})
