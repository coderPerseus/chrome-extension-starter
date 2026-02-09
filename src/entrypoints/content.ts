import {
  LIGHT_READER_UPDATE_MESSAGE,
  isLightReaderUpdateMessage,
} from "@/shared/light-reader/messages"
import { getLightReaderPalette } from "@/shared/light-reader/palettes"
import {
  DEFAULT_LIGHT_READER_SETTINGS,
  LIGHT_READER_SETTINGS_KEY,
  loadLightReaderSettings,
  normalizeLightReaderSettings,
  type LightReaderSettings,
} from "@/shared/light-reader/settings"

const DOCUMENT_STYLE_ID = "light-reader-document-style"
const SHADOW_STYLE_FLAG = "data-light-reader-shadow-style"
const ROOT_MODE_ATTR = "data-light-reader"
const ROOT_PALETTE_ATTR = "data-light-reader-palette"

const trackedShadowRoots = new Set<ShadowRoot>()
const shadowObservers = new Map<ShadowRoot, MutationObserver>()
let pageObserver: MutationObserver | null = null
let activeSettings: LightReaderSettings = DEFAULT_LIGHT_READER_SETTINGS

const getDocumentCss = (settings: LightReaderSettings) => {
  const palette = getLightReaderPalette(settings.paletteId)

  return `
html[${ROOT_MODE_ATTR}="on"] {
  --lr-bg: ${palette.colors.background};
  --lr-surface: ${palette.colors.surface};
  --lr-text: ${palette.colors.text};
  --lr-muted: ${palette.colors.muted};
  --lr-border: ${palette.colors.border};
  --lr-primary: ${palette.colors.primary};
  --lr-on-primary: ${palette.colors.onPrimary};
  --lr-link: ${palette.colors.link};
  --lr-code-bg: ${palette.colors.codeBackground};
  color-scheme: light !important;
}

html[${ROOT_MODE_ATTR}="on"],
html[${ROOT_MODE_ATTR}="on"] body {
  background: var(--lr-bg) !important;
  color: var(--lr-text) !important;
}

html[${ROOT_MODE_ATTR}="on"] *,
html[${ROOT_MODE_ATTR}="on"] *::before,
html[${ROOT_MODE_ATTR}="on"] *::after {
  color-scheme: light !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(
  body,
  article,
  aside,
  blockquote,
  button,
  code,
  dd,
  details,
  dialog,
  div,
  dl,
  dt,
  fieldset,
  figcaption,
  figure,
  footer,
  form,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  header,
  input,
  label,
  legend,
  li,
  main,
  nav,
  ol,
  p,
  pre,
  section,
  select,
  small,
  span,
  strong,
  summary,
  table,
  tbody,
  td,
  textarea,
  tfoot,
  th,
  thead,
  tr,
  ul
):not(
    img,
    picture,
    svg,
    canvas,
    video,
    audio,
    iframe,
    [data-light-reader-ignore]
  ) {
  background-color: var(--lr-surface) !important;
  color: var(--lr-text) !important;
  border-color: var(--lr-border) !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(a, a:visited) {
  color: var(--lr-link) !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(
  button,
  [role="button"],
  input[type="button"],
  input[type="submit"],
  input[type="reset"]
) {
  background-color: var(--lr-primary) !important;
  color: var(--lr-on-primary) !important;
  border-color: var(--lr-primary) !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(input, textarea, select) {
  background-color: var(--lr-bg) !important;
  color: var(--lr-text) !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(code, pre, kbd, samp) {
  background-color: var(--lr-code-bg) !important;
  color: var(--lr-text) !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(hr, table, th, td) {
  border-color: var(--lr-border) !important;
}

html[${ROOT_MODE_ATTR}="on"] :where(::placeholder) {
  color: var(--lr-muted) !important;
}
`
}

const shadowStyleText = `
:host,
:host * {
  color-scheme: light !important;
}

:host {
  background-color: var(--lr-surface, #ffffff) !important;
  color: var(--lr-text, #1f2937) !important;
}

:host :where(
  article,
  aside,
  blockquote,
  button,
  code,
  div,
  footer,
  form,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  header,
  input,
  label,
  li,
  main,
  nav,
  p,
  pre,
  section,
  select,
  span,
  summary,
  table,
  tbody,
  td,
  textarea,
  th,
  thead,
  tr,
  ul
):not(img, picture, svg, canvas, video, audio, iframe, [data-light-reader-ignore]) {
  background-color: var(--lr-surface, #ffffff) !important;
  color: var(--lr-text, #1f2937) !important;
  border-color: var(--lr-border, #d8dbe2) !important;
}

:host :where(a, a:visited) {
  color: var(--lr-link, #2b6cb0) !important;
}

:host :where(button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]) {
  background-color: var(--lr-primary, #2b6cb0) !important;
  color: var(--lr-on-primary, #ffffff) !important;
}
`

const ensureDocumentStyle = (settings: LightReaderSettings) => {
  let style = document.getElementById(DOCUMENT_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement("style")
    style.id = DOCUMENT_STYLE_ID
    ;(document.head ?? document.documentElement).append(style)
  }
  style.textContent = getDocumentCss(settings)
}

const removeDocumentStyle = () => {
  document.getElementById(DOCUMENT_STYLE_ID)?.remove()
}

const ensureShadowRootStyle = (shadowRoot: ShadowRoot) => {
  const existingStyle = shadowRoot.querySelector(`style[${SHADOW_STYLE_FLAG}]`)
  if (existingStyle) return

  const style = document.createElement("style")
  style.setAttribute(SHADOW_STYLE_FLAG, "1")
  style.textContent = shadowStyleText
  shadowRoot.append(style)
}

const clearShadowRootStyle = (shadowRoot: ShadowRoot) => {
  shadowRoot.querySelector(`style[${SHADOW_STYLE_FLAG}]`)?.remove()
}

const trackShadowRoot = (shadowRoot: ShadowRoot) => {
  if (trackedShadowRoots.has(shadowRoot)) {
    if (activeSettings.enabled) ensureShadowRootStyle(shadowRoot)
    return
  }

  trackedShadowRoots.add(shadowRoot)

  if (activeSettings.enabled) {
    ensureShadowRootStyle(shadowRoot)
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        collectShadowRoots(node)
      })
    }
  })

  observer.observe(shadowRoot, {
    childList: true,
    subtree: true,
  })
  shadowObservers.set(shadowRoot, observer)
}

const collectShadowRoots = (node: Node) => {
  if (!(node instanceof Element)) return

  if (node.shadowRoot) {
    trackShadowRoot(node.shadowRoot)
  }

  const childrenWithShadowRoot = node.querySelectorAll("*")
  for (const child of childrenWithShadowRoot) {
    if (child.shadowRoot) {
      trackShadowRoot(child.shadowRoot)
    }
  }
}

const startPageObserver = () => {
  if (pageObserver || !document.documentElement) return

  pageObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        collectShadowRoots(node)
      })
    }
  })

  pageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}

const applyLightReaderSettings = (settings: LightReaderSettings) => {
  activeSettings = settings

  if (!settings.enabled) {
    document.documentElement.removeAttribute(ROOT_MODE_ATTR)
    document.documentElement.removeAttribute(ROOT_PALETTE_ATTR)
    removeDocumentStyle()
    trackedShadowRoots.forEach((shadowRoot) => clearShadowRootStyle(shadowRoot))
    return
  }

  document.documentElement.setAttribute(ROOT_MODE_ATTR, "on")
  document.documentElement.setAttribute(ROOT_PALETTE_ATTR, settings.paletteId)
  ensureDocumentStyle(settings)
  collectShadowRoots(document.documentElement)
  trackedShadowRoots.forEach((shadowRoot) => ensureShadowRootStyle(shadowRoot))
}

const handleMessage = (message: unknown) => {
  if (!isLightReaderUpdateMessage(message)) return
  const nextSettings = normalizeLightReaderSettings(message.settings)
  applyLightReaderSettings(nextSettings)
}

const handleStorageChanged = (
  changes: Record<string, browser.storage.StorageChange>,
  areaName: string,
) => {
  if (areaName !== "local") return
  const changedSettings = changes[LIGHT_READER_SETTINGS_KEY]
  if (!changedSettings) return

  const nextSettings = normalizeLightReaderSettings(changedSettings.newValue)
  applyLightReaderSettings(nextSettings)
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  allFrames: true,
  async main() {
    startPageObserver()
    collectShadowRoots(document.documentElement)
    browser.runtime.onMessage.addListener(handleMessage)
    browser.storage.onChanged.addListener(handleStorageChanged)

    const settings = await loadLightReaderSettings()
    applyLightReaderSettings(settings)
  },
})
