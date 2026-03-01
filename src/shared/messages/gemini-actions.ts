export const GEMINI_POPUP_ACTION_MESSAGE = "EAC_GEMINI_POPUP_ACTION" as const

export const GEMINI_POPUP_ACTIONS = {
  PING: "ping",
  EXPORT_MARKDOWN: "export_markdown",
  EXPORT_GMAIL_DRAFT: "export_gmail_draft",
  DOWNLOAD_WATERMARK_FREE_IMAGES: "download_watermark_free_images",
  DOWNLOAD_ORIGINAL_IMAGES: "download_original_images",
} as const

export type GeminiPopupAction = (typeof GEMINI_POPUP_ACTIONS)[keyof typeof GEMINI_POPUP_ACTIONS]

export type GeminiPopupActionMessage = {
  type: typeof GEMINI_POPUP_ACTION_MESSAGE
  action: GeminiPopupAction
}

export type GeminiPopupActionResponse = {
  ok: boolean
  message: string
}

export const isGeminiPopupAction = (value: unknown): value is GeminiPopupAction => {
  if (typeof value !== "string") return false
  return Object.values(GEMINI_POPUP_ACTIONS).includes(value as GeminiPopupAction)
}

export const isGeminiPopupActionMessage = (value: unknown): value is GeminiPopupActionMessage => {
  if (!value || typeof value !== "object") return false
  const payload = value as GeminiPopupActionMessage
  if (payload.type !== GEMINI_POPUP_ACTION_MESSAGE) return false
  return isGeminiPopupAction(payload.action)
}

export const EAC_ONBOARDING_SEEN_STORAGE_KEY = "eacOnboardingSeenV1" as const
