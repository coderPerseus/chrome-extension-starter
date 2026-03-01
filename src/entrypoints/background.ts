import { EAC_ONBOARDING_SEEN_STORAGE_KEY } from "@/shared/messages/gemini-actions"
import { ORPC_PORT_NAME } from "@/shared/orpc/constants"
import { router } from "@/shared/orpc/router"
import { RPCHandler } from "@orpc/server/message-port"

const handler = new RPCHandler(router)
const DOWNLOAD_IMAGES_MESSAGE = "EAC_DOWNLOAD_IMAGES"
const FETCH_IMAGE_BLOB_MESSAGE = "EAC_FETCH_IMAGE_BLOB"

type DownloadImageItem = {
  url: string
  filename: string
}

type DownloadImagesMessage = {
  type: typeof DOWNLOAD_IMAGES_MESSAGE
  items: DownloadImageItem[]
}

type FetchImageBlobMessage = {
  type: typeof FETCH_IMAGE_BLOB_MESSAGE
  url: string
  referrer?: string
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
}

const isDownloadImagesMessage = (value: unknown): value is DownloadImagesMessage => {
  if (!value || typeof value !== "object") return false
  const payload = value as DownloadImagesMessage
  if (payload.type !== DOWNLOAD_IMAGES_MESSAGE) return false
  if (!Array.isArray(payload.items)) return false
  return payload.items.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.url === "string" &&
      item.url.length > 0 &&
      typeof item.filename === "string" &&
      item.filename.length > 0
  )
}

const isFetchImageBlobMessage = (value: unknown): value is FetchImageBlobMessage => {
  if (!value || typeof value !== "object") return false
  const payload = value as FetchImageBlobMessage
  if (payload.type !== FETCH_IMAGE_BLOB_MESSAGE) return false
  if (typeof payload.url !== "string" || payload.url.length === 0) return false
  if (
    payload.referrer !== undefined &&
    (typeof payload.referrer !== "string" || payload.referrer.length === 0)
  ) {
    return false
  }
  return true
}

const downloadImages = async (items: DownloadImageItem[]) => {
  const errors: string[] = []
  let downloaded = 0

  for (const item of items) {
    try {
      await browser.downloads.download({
        url: item.url,
        filename: item.filename.replace(/^\/+/, ""),
        conflictAction: "uniquify",
        saveAs: false,
      })
      downloaded += 1
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  return { ok: true, downloaded, errors }
}

const inferImageMimeType = (url: string, contentTypeHeader: string | null) => {
  const normalizedContentType = contentTypeHeader?.split(";")[0].trim().toLowerCase() || ""
  if (normalizedContentType.startsWith("image/")) return normalizedContentType

  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const matchedExt = pathname.match(/\.([a-z0-9]+)$/)?.[1]
    if (matchedExt && EXTENSION_MIME_MAP[matchedExt]) {
      return EXTENSION_MIME_MAP[matchedExt]
    }
  } catch {
    return normalizedContentType === "" ? "" : null
  }

  if (
    normalizedContentType === "" ||
    normalizedContentType === "application/octet-stream" ||
    normalizedContentType === "binary/octet-stream"
  ) {
    return ""
  }

  return null
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

const fetchImageBlob = async (url: string, referrer?: string) => {
  try {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "include",
      redirect: "follow",
      cache: "no-store",
      referrer: referrer || undefined,
      referrerPolicy: "strict-origin-when-cross-origin",
    })

    if (!response.ok) {
      return {
        ok: false as const,
        error: `图片请求失败(${response.status})`,
      }
    }

    const contentTypeHeader = response.headers.get("content-type")
    const contentType = inferImageMimeType(url, contentTypeHeader)
    if (contentType === null) {
      return {
        ok: false as const,
        error: `后台返回非图片内容(${contentTypeHeader || "unknown"})`,
      }
    }

    const buffer = await response.arrayBuffer()
    const mimeSegment = contentType || ""
    const dataUrl = `data:${mimeSegment};base64,${arrayBufferToBase64(buffer)}`

    return {
      ok: true as const,
      dataUrl,
      contentType,
    }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install") return

    void browser.storage.local
      .set({ [EAC_ONBOARDING_SEEN_STORAGE_KEY]: false })
      .catch(() => undefined)

    void browser.tabs.create({
      url: browser.runtime.getURL("/onboarding.html"),
    })
  })

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== ORPC_PORT_NAME) return
    if (port.sender?.id !== browser.runtime.id) {
      console.warn("[oRPC] rejected port", {
        name: port.name,
        sender: port.sender,
      })
      port.disconnect()
      return
    }
    handler.upgrade(port)
  })

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (isDownloadImagesMessage(message)) {
      void downloadImages(message.items)
        .then((response) => sendResponse(response))
        .catch((error) => {
          sendResponse({
            ok: false,
            downloaded: 0,
            errors: [error instanceof Error ? error.message : String(error)],
          })
        })
      return true
    }

    if (isFetchImageBlobMessage(message)) {
      void fetchImageBlob(message.url, message.referrer)
        .then((response) => sendResponse(response))
        .catch((error) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      return true
    }

    return
  })

  console.log("oRPC background ready", { id: browser.runtime.id })
})
