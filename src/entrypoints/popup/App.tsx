import { useEffect, useMemo, useState } from "react"
import logoUrl from "@/assets/logo.png"
import {
  LIGHT_READER_UPDATE_MESSAGE,
  type LightReaderUpdateMessage,
} from "@/shared/light-reader/messages"
import {
  LIGHT_READER_PALETTES,
  getLightReaderPalette,
} from "@/shared/light-reader/palettes"
import {
  DEFAULT_LIGHT_READER_SETTINGS,
  loadLightReaderSettings,
  normalizeLightReaderSettings,
  saveLightReaderSettings,
  type LightReaderSettings,
} from "@/shared/light-reader/settings"

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

const sendSettingsToActiveTab = async (settings: LightReaderSettings) => {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (!activeTab?.id) return

  const message: LightReaderUpdateMessage = {
    type: LIGHT_READER_UPDATE_MESSAGE,
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
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState("")

  const appName = useMemo(() => {
    return getI18nMessage("appName") || "light-reader"
  }, [])

  const appDescription = useMemo(() => {
    return getI18nMessage("appDescription") || "Bring bright themes back to any website."
  }, [])

  useEffect(() => {
    loadLightReaderSettings()
      .then((stored) => {
        setSettings(stored)
      })
      .catch((error) => {
        setErrorText(`读取配置失败: ${formatError(error)}`)
      })
      .finally(() => {
        setIsReady(true)
      })
  }, [])

  const saveAndBroadcast = async (nextSettings: LightReaderSettings) => {
    setIsSaving(true)
    setErrorText("")

    const normalized = normalizeLightReaderSettings(nextSettings)
    setSettings(normalized)

    try {
      const persisted = await saveLightReaderSettings(normalized)
      await sendSettingsToActiveTab(persisted)
    } catch (error) {
      setErrorText(`保存配置失败: ${formatError(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const activePalette = useMemo(() => getLightReaderPalette(settings.paletteId), [settings.paletteId])

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="brand">
          <img src={logoUrl} alt="" className="brand-icon" />
          <div className="brand-copy">
            <p className="brand-kicker">Extension</p>
            <h1 className="brand-title">{appName}</h1>
          </div>
        </div>
        <label className={`switch ${settings.enabled ? "is-on" : ""}`}>
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={!isReady || isSaving}
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
          <span className="switch-label">{settings.enabled ? "ON" : "OFF"}</span>
        </label>
      </header>

      <section className="status-card">
        <p className="status-title">{settings.enabled ? "明亮模式已开启" : "明亮模式已关闭"}</p>
        <p className="status-desc">
          {settings.enabled
            ? `当前配色：${activePalette.name}，会立即作用于当前网页。`
            : "开启后会注入亮色样式并兼容多数动态网页结构。"}
        </p>
      </section>

      <section className="palette-panel">
        <div className="palette-header">
          <h2>配色方案</h2>
          <span>{LIGHT_READER_PALETTES.length} 套</span>
        </div>
        <div className="palette-grid">
          {LIGHT_READER_PALETTES.map((palette) => {
            const isActive = settings.paletteId === palette.id
            return (
              <button
                key={palette.id}
                type="button"
                className={`palette-card ${isActive ? "is-active" : ""}`}
                disabled={!isReady || isSaving}
                onClick={() => {
                  void saveAndBroadcast({
                    enabled: true,
                    paletteId: palette.id,
                  })
                }}
              >
                <div className="palette-card-head">
                  <span className="palette-name">{palette.name}</span>
                  {isActive ? <span className="palette-tag">当前</span> : null}
                </div>
                <p className="palette-desc">{palette.description}</p>
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
      </section>

      <footer className="popup-footer">
        <p>{appDescription}</p>
        {errorText ? <p className="error-text">{errorText}</p> : null}
      </footer>
    </div>
  )
}

export default App
