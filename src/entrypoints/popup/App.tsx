import {
  LIGHT_READER_UPDATE_MESSAGE,
  type LightReaderUpdateMessage,
} from "@/shared/light-reader/messages"
import { LIGHT_READER_PALETTES } from "@/shared/light-reader/palettes"
import {
  DEFAULT_LIGHT_READER_SETTINGS,
  type LightReaderSettings,
  getDomainFromUrl,
  loadLightReaderSettingsForDomain,
  normalizeLightReaderSettings,
  saveLightReaderSettingsForDomain,
} from "@/shared/light-reader/settings"
import { useEffect, useMemo, useState } from "react"

type UiLocale = "zh" | "en"

const UI_LOCALE_KEY = "light-reader:ui-locale"

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

const getI18nMessage = (key: string) => {
  const globals = globalThis as typeof globalThis & {
    browser?: { i18n?: { getMessage?: (message: string) => string } }
    chrome?: { i18n?: { getMessage?: (message: string) => string } }
  }
  return globals.browser?.i18n?.getMessage?.(key) ?? globals.chrome?.i18n?.getMessage?.(key) ?? ""
}

const getUiLanguage = () => {
  const globals = globalThis as typeof globalThis & {
    browser?: { i18n?: { getUILanguage?: () => string } }
    chrome?: { i18n?: { getUILanguage?: () => string } }
  }

  return globals.browser?.i18n?.getUILanguage?.() ?? globals.chrome?.i18n?.getUILanguage?.() ?? ""
}

const normalizeUiLocale = (value: unknown): UiLocale => {
  return value === "en" ? "en" : "zh"
}

const getDefaultUiLocale = (): UiLocale => {
  return getUiLanguage().toLowerCase().startsWith("zh") ? "zh" : "en"
}

const getPopupText = (uiLocale: UiLocale) => {
  if (uiLocale === "en") {
    return {
      palettes: "Palettes",
      active: "Current",
      on: "ON",
      off: "OFF",
      saveFailed: "Failed to save settings",
      loadFailed: "Failed to load settings",
      unsupportedDomain: "This page cannot be controlled by the extension.",
      noDomain: "No domain",
      learnLabel: "Learn why light mode helps",
    }
  }

  return {
    palettes: "配色方案",
    active: "当前",
    on: "开",
    off: "关",
    saveFailed: "保存配置失败",
    loadFailed: "读取配置失败",
    unsupportedDomain: "当前页面不支持扩展控制。",
    noDomain: "无域名",
    learnLabel: "了解浅色模式科普",
  }
}

const PALETTE_DESCRIPTIONS: Record<string, { zh: string; en: string }> = {
  guji: {
    zh: "仿老式线装书的温润纸感",
    en: "Classic Chinese book-paper tone for reading",
  },
  "tech-blue": {
    zh: "清爽科技感浅蓝界面",
    en: "Crisp high-tech light blue palette",
  },
  "mono-minimal": {
    zh: "黑白灰中性风格，干净利落",
    en: "Minimal black-white-gray neutral style",
  },
  latte: {
    zh: "高人气奶咖浅色，柔和耐看",
    en: "Popular latte style with soft contrast",
  },
  "solarized-light": {
    zh: "经典护眼浅色方案，长文友好",
    en: "Classic eye-friendly light scheme for long pages",
  },
  linen: {
    zh: "奶白纸感，适合长时间阅读",
    en: "Warm paper-white for long reading sessions",
  },
  sakura: {
    zh: "粉白暖调，柔和不刺眼",
    en: "Soft rose tint with gentle contrast",
  },
  mint: {
    zh: "青绿薄荷，清爽明亮",
    en: "Clean mint tones with bright clarity",
  },
  sunrise: {
    zh: "暖沙与琥珀，提升可读对比",
    en: "Amber sand palette with clear readability",
  },
  nord: {
    zh: "冰蓝灰阶，信息结构清晰",
    en: "Cool blue-gray hierarchy for structured pages",
  },
  clay: {
    zh: "米黄与陶土，复古编辑感",
    en: "Beige-clay editorial tone with calm contrast",
  },
}

const sendSettingsToActiveTab = async (domain: string, settings: LightReaderSettings) => {
  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })
  if (!activeTab?.id) return

  const message: LightReaderUpdateMessage = {
    type: LIGHT_READER_UPDATE_MESSAGE,
    domain,
    settings,
  }

  try {
    await browser.tabs.sendMessage(activeTab.id, message)
  } catch (_error) {
    // Tabs like browser:// pages do not accept content script messages.
  }
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_LIGHT_READER_SETTINGS)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)
  const [uiLocale, setUiLocale] = useState<UiLocale>(getDefaultUiLocale())
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState("")

  const appName = useMemo(() => {
    return getI18nMessage("appName") || "light-reader"
  }, [])

  const text = useMemo(() => getPopupText(uiLocale), [uiLocale])
  const controlsDisabled = !isReady || isSaving || !activeDomain

  useEffect(() => {
    const initialize = async () => {
      try {
        const [localeRaw, tabs] = await Promise.all([
          browser.storage.local.get(UI_LOCALE_KEY),
          browser.tabs.query({ active: true, currentWindow: true }),
        ])

        const storedLocale = localeRaw[UI_LOCALE_KEY]
        const nextLocale = storedLocale ? normalizeUiLocale(storedLocale) : getDefaultUiLocale()
        const localeText = getPopupText(nextLocale)
        setUiLocale(nextLocale)

        const activeTab = tabs[0]
        const domain = getDomainFromUrl(activeTab?.url)
        setActiveDomain(domain)

        if (!domain) {
          setSettings(DEFAULT_LIGHT_READER_SETTINGS)
          setErrorText(localeText.unsupportedDomain)
          return
        }

        const domainSettings = await loadLightReaderSettingsForDomain(domain)
        setSettings(domainSettings)
      } catch (error) {
        const localeText = getPopupText(getDefaultUiLocale())
        setErrorText(`${localeText.loadFailed}: ${formatError(error)}`)
      } finally {
        setIsReady(true)
      }
    }

    void initialize()
  }, [])

  const saveAndBroadcast = async (nextSettings: LightReaderSettings) => {
    if (!activeDomain) return

    setIsSaving(true)
    setErrorText("")

    const normalized = normalizeLightReaderSettings(nextSettings)
    setSettings(normalized)

    try {
      const persisted = await saveLightReaderSettingsForDomain(activeDomain, normalized)
      await sendSettingsToActiveTab(activeDomain, persisted)
    } catch (error) {
      setErrorText(`${text.saveFailed}: ${formatError(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleUiLocale = async () => {
    const nextLocale: UiLocale = uiLocale === "zh" ? "en" : "zh"
    setUiLocale(nextLocale)

    if (!activeDomain) {
      setErrorText(getPopupText(nextLocale).unsupportedDomain)
    }

    try {
      await browser.storage.local.set({
        [UI_LOCALE_KEY]: nextLocale,
      })
    } catch (error) {
      setErrorText(`${text.saveFailed}: ${formatError(error)}`)
    }
  }

  const openLearnPage = async () => {
    const url = browser.runtime.getURL(`/learn.html?lang=${uiLocale}`)
    await browser.tabs.create({ url })
  }

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="title-wrap">
          <h1 className="brand-title">{appName}</h1>
          <button
            type="button"
            className="help-link"
            title={text.learnLabel}
            aria-label={text.learnLabel}
            onClick={() => {
              void openLearnPage()
            }}
          >
            ?
          </button>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="lang-toggle"
            onClick={() => {
              void toggleUiLocale()
            }}
            disabled={!isReady || isSaving}
          >
            中 / EN
          </button>
          <label
            className={`switch ${settings.enabled ? "is-on" : ""} ${controlsDisabled ? "is-disabled" : ""}`}
          >
            <input
              type="checkbox"
              checked={settings.enabled}
              disabled={controlsDisabled}
              onChange={(event) => {
                void saveAndBroadcast({
                  ...settings,
                  enabled: event.target.checked,
                })
              }}
            />
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">{settings.enabled ? text.on : text.off}</span>
          </label>
        </div>
      </header>

      <section className="palette-panel">
        <div className="palette-header">
          <span>{text.palettes}</span>
          {/* <span className="domain-label">{activeDomain ?? text.noDomain}</span> */}
        </div>
        <div className="palette-grid">
          {LIGHT_READER_PALETTES.map((palette) => {
            const isActive = settings.paletteId === palette.id
            return (
              <button
                key={palette.id}
                type="button"
                className={`palette-card ${isActive ? "is-active" : ""}`}
                disabled={controlsDisabled}
                onClick={() => {
                  void saveAndBroadcast({
                    enabled: true,
                    paletteId: palette.id,
                  })
                }}
              >
                <div className="palette-card-head">
                  <div className="palette-meta">
                    <span className="palette-name">{palette.name}</span>
                    <span className="palette-desc">
                      {PALETTE_DESCRIPTIONS[palette.id]?.[uiLocale] ?? palette.description}
                    </span>
                  </div>
                  {isActive ? <span className="palette-tag">{text.active}</span> : null}
                </div>
                <div className="palette-swatches">
                  {[
                    palette.colors.background,
                    palette.colors.surface,
                    palette.colors.primary,
                    palette.colors.link,
                    palette.colors.text,
                  ].map((color) => (
                    <span key={color} className="swatch" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
        {errorText ? <p className="error-text">{errorText}</p> : null}
      </section>
    </div>
  )
}

export default App
