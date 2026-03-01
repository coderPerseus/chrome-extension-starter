import watermarkBg48Url from "@/assets/gemini-watermark-bg-48.png"
import watermarkBg96Url from "@/assets/gemini-watermark-bg-96.png"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  role: ChatRole
  text: string
  markdown: string
}

type FetchImageBlobResponse =
  | {
      ok: true
      dataUrl: string
      contentType: string
    }
  | {
      ok: false
      error: string
    }

type WatermarkConfig = {
  logoSize: 48 | 96
  marginRight: number
  marginBottom: number
}

type WatermarkPosition = {
  x: number
  y: number
  width: number
  height: number
}

type MarkdownRenderContext = {
  inline: boolean
  listDepth: number
}

const FETCH_IMAGE_BLOB_MESSAGE = "EAC_FETCH_IMAGE_BLOB"
const PANEL_ID = "eac-gemini-tools"
const STYLE_ID = "eac-gemini-tools-style"
const MESSAGE_SELECTOR = "user-query, model-response"
const GENERATED_IMAGE_CONTAINER_SELECTOR = "generated-image, .generated-image-container"
const WATERMARK_PROCESSED_STATE_KEY = "eacWatermarkProcessed"
const AUTO_PROCESS_DEBOUNCE_MS = 120
const IMAGE_DOWNLOAD_THROTTLE_MS = 150

const WATERMARK_ALPHA_THRESHOLD = 0.002
const WATERMARK_MAX_ALPHA = 0.99
const WATERMARK_LOGO_VALUE = 255

const USER_MESSAGE_SELECTORS = ["div.query-content", "query-content", ".query-content"]

const ASSISTANT_MESSAGE_SELECTORS = [
  "message-content",
  ".message-content",
  ".markdown",
  ".response-content",
]

const MARKDOWN_BLOCK_TAGS = new Set([
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "dt",
  "dd",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "thead",
  "tfoot",
  "tr",
  "td",
  "th",
  "ul",
])

const findFirst = (root: ParentNode, selectors: string[]): HTMLElement | null => {
  for (const selector of selectors) {
    const element = root.querySelector<HTMLElement>(selector)
    if (element) return element
  }
  return null
}

const normalizeText = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const normalizeInline = (value: string) =>
  normalizeText(value)
    .replace(/\n+/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim()

const normalizeMarkdownOutput = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

const getChatTitle = () => {
  const title = document.title
    .replace(/^Gemini\s*-\s*/i, "")
    .replace(/\s*-\s*Gemini\s*$/i, "")
    .trim()
  return title || "Gemini Chat"
}

const toSafeFileName = (value: string) =>
  (
    value
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim() || "chat"
  ).slice(0, 80)

const getTimestamp = () => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

const wait = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms))

const isHTMLElementNode = (node: Node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE

const isTextNode = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE

const isSkippableNode = (element: HTMLElement) => {
  const tag = element.tagName.toLowerCase()
  if (
    tag === "script" ||
    tag === "style" ||
    tag === "noscript" ||
    tag === "button" ||
    tag === "svg" ||
    tag === "path" ||
    tag === "textarea" ||
    tag === "input"
  ) {
    return true
  }
  if (element.getAttribute("aria-hidden") === "true" && !element.textContent?.trim()) {
    return true
  }
  return false
}

const getCodeLanguage = (element: HTMLElement) => {
  const byAttribute = element.getAttribute("data-language") || element.getAttribute("lang")
  if (byAttribute) return byAttribute.toLowerCase()

  for (const className of element.classList) {
    const languageMatch = className.match(/(?:lang|language)-([a-z0-9_+-]+)/i)
    if (languageMatch?.[1]) return languageMatch[1].toLowerCase()
  }
  return ""
}

const formatInlineCode = (value: string) => {
  const content = value.replace(/\r/g, "").trim()
  if (!content) return ""
  const delimiter = content.includes("`") ? "``" : "`"
  return `${delimiter}${content}${delimiter}`
}

const escapeMarkdownLinkText = (value: string) => value.replace(/\[/g, "\\[").replace(/\]/g, "\\]")

const escapeMarkdownLinkUrl = (value: string) => value.replace(/\(/g, "%28").replace(/\)/g, "%29")

const escapeMarkdownTableCell = (value: string) => value.replace(/\|/g, "\\|").trim()

const renderChildren = (parent: ParentNode, context: MarkdownRenderContext): string =>
  Array.from(parent.childNodes)
    .map((node) => renderNode(node, context))
    .join("")

const renderTable = (table: HTMLElement) => {
  const rows = Array.from(table.querySelectorAll("tr")).filter((row) => row.querySelector("th,td"))
  if (rows.length === 0) return ""

  const cellRows = rows.map((row) =>
    Array.from(row.querySelectorAll("th,td")).map((cell) => {
      const markdown = renderChildren(cell, { inline: true, listDepth: 0 })
      return escapeMarkdownTableCell(normalizeInline(markdown) || " ")
    })
  )

  const columnCount = Math.max(...cellRows.map((row) => row.length), 0)
  if (columnCount <= 0) return ""

  for (const row of cellRows) {
    while (row.length < columnCount) row.push(" ")
  }

  const firstRow = rows[0]
  const hasExplicitHeader = firstRow.querySelector("th") !== null
  const header = cellRows[0]
  const bodyRows = hasExplicitHeader ? cellRows.slice(1) : cellRows.slice(1)
  const lines: string[] = []

  lines.push(`| ${header.join(" | ")} |`)
  lines.push(`| ${new Array(columnCount).fill("---").join(" | ")} |`)

  for (const row of bodyRows) {
    lines.push(`| ${row.join(" | ")} |`)
  }

  return `${lines.join("\n")}\n\n`
}

const renderList = (list: HTMLElement, ordered: boolean, listDepth: number): string => {
  const lines: string[] = []
  const items = Array.from(list.children).filter(
    (child): child is HTMLElement => child.tagName.toLowerCase() === "li"
  )

  items.forEach((item, index) => {
    const marker = ordered ? `${index + 1}.` : "-"
    const indent = "  ".repeat(listDepth)
    const contentParts: string[] = []
    const nestedParts: string[] = []

    for (const child of Array.from(item.childNodes)) {
      if (isHTMLElementNode(child)) {
        const tag = child.tagName.toLowerCase()
        if (tag === "ul") {
          nestedParts.push(renderList(child, false, listDepth + 1))
          continue
        }
        if (tag === "ol") {
          nestedParts.push(renderList(child, true, listDepth + 1))
          continue
        }
      }
      contentParts.push(renderNode(child, { inline: true, listDepth }))
    }

    const content = normalizeInline(contentParts.join(""))
    lines.push(content ? `${indent}${marker} ${content}` : `${indent}${marker}`)
    for (const nested of nestedParts) {
      const cleaned = nested.trimEnd()
      if (cleaned) lines.push(cleaned)
    }
  })

  return lines.length > 0 ? `${lines.join("\n")}\n\n` : ""
}

const renderNode = (node: Node, context: MarkdownRenderContext): string => {
  if (isTextNode(node)) {
    return normalizeText(node.textContent || "")
  }

  if (!isHTMLElementNode(node)) return ""
  if (isSkippableNode(node)) return ""

  const tag = node.tagName.toLowerCase()

  if (tag === "br") return "\n"
  if (tag === "hr") return "\n---\n\n"

  if (tag === "pre") {
    const codeElement = node.querySelector<HTMLElement>("code")
    const language = getCodeLanguage(codeElement || node)
    const codeText = (codeElement?.textContent || node.textContent || "")
      .replace(/\r/g, "")
      .replace(/\n+$/, "")
    if (!codeText.trim()) return ""
    return `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`
  }

  if (tag === "code") {
    if (node.parentElement?.tagName.toLowerCase() === "pre") return ""
    return formatInlineCode(node.textContent || "")
  }

  if (tag === "img") {
    const image = node as HTMLImageElement
    const src = image.currentSrc || image.src || image.getAttribute("src") || ""
    if (!src || src.startsWith("data:")) return ""
    const alt = escapeMarkdownLinkText(image.alt || "image")
    return `![${alt}](${escapeMarkdownLinkUrl(src)})`
  }

  if (tag === "a") {
    const href = node.getAttribute("href") || ""
    const text = normalizeInline(renderChildren(node, { inline: true, listDepth: 0 }))
    if (!href || href.startsWith("javascript:")) return text
    return `[${escapeMarkdownLinkText(text || href)}](${escapeMarkdownLinkUrl(href)})`
  }

  if (tag === "strong" || tag === "b") {
    const text = normalizeInline(renderChildren(node, { inline: true, listDepth: 0 }))
    return text ? `**${text}**` : ""
  }

  if (tag === "em" || tag === "i") {
    const text = normalizeInline(renderChildren(node, { inline: true, listDepth: 0 }))
    return text ? `*${text}*` : ""
  }

  if (tag === "ul") return renderList(node, false, context.listDepth)
  if (tag === "ol") return renderList(node, true, context.listDepth)

  if (tag === "blockquote") {
    const content = normalizeMarkdownOutput(
      renderChildren(node, { inline: false, listDepth: context.listDepth })
    )
    if (!content) return ""
    const quoted = content
      .split("\n")
      .map((line) => (line.trim() ? `> ${line}` : ">"))
      .join("\n")
    return `${quoted}\n\n`
  }

  if (tag === "table") return renderTable(node)

  if (/^h[1-6]$/.test(tag)) {
    const level = Math.max(1, Math.min(6, Number.parseInt(tag.slice(1), 10) || 1))
    const content = normalizeInline(renderChildren(node, { inline: true, listDepth: 0 }))
    if (!content) return ""
    return `${"#".repeat(level)} ${content}\n\n`
  }

  if (tag === "li") {
    const content = normalizeInline(
      renderChildren(node, { inline: true, listDepth: context.listDepth })
    )
    return content ? `${content}\n` : ""
  }

  const content = renderChildren(node, {
    inline: context.inline,
    listDepth: context.listDepth,
  })

  const isBlockLike = MARKDOWN_BLOCK_TAGS.has(tag) || tag.includes("-")
  if (!isBlockLike) return content

  const block = normalizeMarkdownOutput(content)
  return block ? `${block}\n\n` : ""
}

const convertElementToMarkdown = (element: HTMLElement) => {
  const cloned = element.cloneNode(true) as HTMLElement
  const removableNodes = cloned.querySelectorAll(
    "button,script,style,noscript,svg,path,message-actions,[aria-label*='copy' i],.copy-button"
  )
  for (const removableNode of removableNodes) {
    removableNode.remove()
  }
  const markdown = renderChildren(cloned, { inline: false, listDepth: 0 })
  return normalizeMarkdownOutput(markdown)
}

const extractChatMessages = (): ChatMessage[] => {
  const items = Array.from(document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR))
  const messages: ChatMessage[] = []

  for (const item of items) {
    const tagName = item.tagName.toLowerCase()
    if (tagName === "user-query") {
      const contentElement = findFirst(item, USER_MESSAGE_SELECTORS) ?? item
      const text = normalizeText(contentElement.innerText || item.innerText || "")
      if (!text) continue
      const markdown = convertElementToMarkdown(contentElement) || text
      messages.push({ role: "user", text, markdown })
      continue
    }

    if (tagName === "model-response") {
      const contentElement = findFirst(item, ASSISTANT_MESSAGE_SELECTORS) ?? item
      const text = normalizeText(contentElement.innerText || item.innerText || "")
      if (!text) continue
      const markdown = convertElementToMarkdown(contentElement) || text
      messages.push({ role: "assistant", text, markdown })
    }
  }

  return messages
}

const buildMarkdown = (messages: ChatMessage[]) => {
  const title = getChatTitle()
  const lines: string[] = [
    `# ${title}`,
    "",
    `> Source: ${location.href}`,
    `> Exported at: ${new Date().toLocaleString()}`,
    "",
  ]

  for (const message of messages) {
    lines.push(`## ${message.role === "user" ? "You asked" : "Gemini response"}`)
    lines.push("")
    lines.push(message.markdown || message.text)
    lines.push("")
  }

  return lines.join("\n")
}

const buildGmailBody = (messages: ChatMessage[]) => {
  const title = getChatTitle()
  const lines: string[] = [
    `Gemini Chat Export: ${title}`,
    `Source: ${location.href}`,
    `Exported at: ${new Date().toLocaleString()}`,
    "",
  ]

  messages.forEach((message, index) => {
    lines.push(`${index + 1}. ${message.role === "user" ? "User" : "Assistant"}`)
    lines.push(message.text)
    lines.push("")
  })

  return lines.join("\n")
}

const triggerBlobDownload = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  triggerBlobDownload(filename, new Blob([content], { type: mimeType }))
}

const isLikelyDecorativeImage = (img: HTMLImageElement) => {
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  if (!width || !height) return false
  return width <= 64 && height <= 64
}

const ORIGINAL_IMAGE_ATTRIBUTE_HINTS = [
  "data-original-src",
  "data-origin-src",
  "data-full-src",
  "data-full-url",
  "data-download-url",
  "data-source-url",
  "data-large-src",
  "data-eac-original-url",
]

const isSupportedImageProtocol = (value: string) =>
  value.startsWith("https:") ||
  value.startsWith("http:") ||
  value.startsWith("blob:") ||
  value.startsWith("data:")

const toAbsoluteImageUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith("javascript:")) return ""
  try {
    const url = new URL(trimmed, location.href)
    const absolute = url.toString()
    if (!isSupportedImageProtocol(absolute)) return ""
    if (absolute.startsWith("data:")) return ""
    return absolute
  } catch {
    return ""
  }
}

const isLikelyImageResourceUrl = (value: string) => {
  if (value.startsWith("blob:") || value.startsWith("data:")) return true

  try {
    const url = new URL(value)
    if (/(^|\.)(googleusercontent\.com|ggpht\.com)$/i.test(url.hostname)) return true
    const pathname = url.pathname.toLowerCase()
    if (/\.(png|jpe?g|webp|gif|bmp|svg|avif)(?:$|[/?#])/.test(pathname)) return true
    if (/(?:^|\/)(?:image|images|media)(?:\/|$)/.test(pathname)) return true
    const search = url.search.toLowerCase()
    if (/(?:^|[?&])(img|image|media|content)=/.test(search)) return true
    return false
  } catch {
    return false
  }
}

const parseSrcSetEntries = (srcset: string) => {
  const parts = srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  const parsed = parts
    .map((entry) => {
      const [urlPart, descriptor = ""] = entry.split(/\s+/, 2)
      const width = Number.parseInt(descriptor.replace(/[^0-9]/g, ""), 10)
      const rank = Number.isFinite(width) ? width : 0
      return {
        url: toAbsoluteImageUrl(urlPart),
        rank,
      }
    })
    .filter((entry) => entry.url.length > 0)
  parsed.sort((a, b) => b.rank - a.rank)
  return parsed.map((entry) => entry.url)
}

const rewriteGoogleImageToOriginalUrl = (value: string) => {
  try {
    const url = new URL(value)
    if (!/(^|\.)(googleusercontent\.com|ggpht\.com)$/i.test(url.hostname)) return ""
    const marker = url.pathname.lastIndexOf("=")
    if (marker <= url.pathname.lastIndexOf("/")) return ""
    const optionSuffix = url.pathname.slice(marker + 1)
    if (!/[a-z]/i.test(optionSuffix) || !/\d/.test(optionSuffix)) return ""
    const rewritten = new URL(url.toString())
    rewritten.pathname = `${url.pathname.slice(0, marker)}=s0`
    return rewritten.toString()
  } catch {
    return ""
  }
}

const pushUniqueUrl = (target: string[], value: string) => {
  if (!value) return
  if (target.includes(value)) return
  target.push(value)
}

const collectOriginalImageCandidates = (image: HTMLImageElement) => {
  const candidates: string[] = []

  for (const attributeName of ORIGINAL_IMAGE_ATTRIBUTE_HINTS) {
    const value = image.getAttribute(attributeName)
    if (!value) continue
    pushUniqueUrl(candidates, toAbsoluteImageUrl(value))
  }

  for (const attributeName of image.getAttributeNames()) {
    if (!/original|origin|full|source|download|large|master/i.test(attributeName)) continue
    const value = image.getAttribute(attributeName)
    if (!value) continue
    pushUniqueUrl(candidates, toAbsoluteImageUrl(value))
  }

  for (const [key, value] of Object.entries(image.dataset)) {
    if (!value) continue
    if (!/original|origin|full|source|download|large|master/i.test(key)) continue
    pushUniqueUrl(candidates, toAbsoluteImageUrl(value))
  }

  const parentLink = image.closest<HTMLAnchorElement>("a[href]")
  if (parentLink?.href) {
    pushUniqueUrl(candidates, toAbsoluteImageUrl(parentLink.href))
  }

  const srcset = image.getAttribute("data-srcset") || image.getAttribute("srcset") || image.srcset
  if (srcset) {
    for (const srcsetUrl of parseSrcSetEntries(srcset)) {
      pushUniqueUrl(candidates, srcsetUrl)
    }
  }

  pushUniqueUrl(candidates, toAbsoluteImageUrl(image.currentSrc || ""))
  pushUniqueUrl(candidates, toAbsoluteImageUrl(image.src || ""))
  pushUniqueUrl(candidates, toAbsoluteImageUrl(image.getAttribute("src") || ""))

  return candidates
}

const selectBestImageUrl = (candidates: string[]) => {
  for (const candidate of candidates) {
    const rewritten = rewriteGoogleImageToOriginalUrl(candidate)
    if (rewritten) {
      return rewritten
    }

    if (!isLikelyImageResourceUrl(candidate)) continue

    if (!candidate.startsWith("blob:")) {
      return candidate
    }
  }

  return candidates[0] || ""
}

const isGeminiGeneratedImageElement = (image: HTMLImageElement) => {
  if (isLikelyDecorativeImage(image)) return false
  if (image.closest(GENERATED_IMAGE_CONTAINER_SELECTOR)) return true

  const src = image.currentSrc || image.src || image.getAttribute("src") || ""
  if (!src) return false
  if (!/(googleusercontent\.com|ggpht\.com)/i.test(src)) return false
  return image.closest("model-response") !== null
}

const findGeminiGeneratedImages = () => {
  const roots = Array.from(document.querySelectorAll<HTMLElement>("model-response"))
  const searchRoots = roots.length > 0 ? roots : [document.documentElement]
  const result: HTMLImageElement[] = []
  const visited = new Set<HTMLImageElement>()

  for (const root of searchRoots) {
    const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"))
    for (const image of images) {
      if (visited.has(image)) continue
      visited.add(image)
      if (!isGeminiGeneratedImageElement(image)) continue
      result.push(image)
    }
  }

  return result
}

const collectGeminiOriginalImageUrls = () => {
  const urls = new Set<string>()

  for (const image of findGeminiGeneratedImages()) {
    const selected = selectBestImageUrl(collectOriginalImageCandidates(image))
    if (selected) {
      urls.add(selected)
    }
  }

  return Array.from(urls)
}

let watermarkAlphaMap48: Float32Array | null = null
let watermarkAlphaMap96: Float32Array | null = null
let watermarkAssetPromise: Promise<void> | null = null

const loadImage = async (src: string, crossOrigin?: "anonymous" | "use-credentials") =>
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (crossOrigin) {
      image.crossOrigin = crossOrigin
    }
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Image load failed: ${src}`))
    image.src = src
  })

const loadImageFromBlob = async (blob: Blob) =>
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Blob image load failed"))
    }
    image.src = url
  })

const calculateAlphaMap = (imageData: ImageData) => {
  const { width, height, data } = imageData
  const alphaMap = new Float32Array(width * height)
  for (let index = 0; index < alphaMap.length; index += 1) {
    const pixel = index * 4
    const maxChannel = Math.max(data[pixel], data[pixel + 1], data[pixel + 2])
    alphaMap[index] = maxChannel / 255
  }
  return alphaMap
}

const getAlphaMapFromAsset = async (assetUrl: string, size: 48 | 96) => {
  const image = await loadImage(assetUrl)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) throw new Error("无法创建水印模板画布上下文")
  context.drawImage(image, 0, 0, size, size)
  const imageData = context.getImageData(0, 0, size, size)
  return calculateAlphaMap(imageData)
}

const ensureWatermarkAssetsLoaded = async () => {
  if (watermarkAlphaMap48 && watermarkAlphaMap96) return
  if (!watermarkAssetPromise) {
    watermarkAssetPromise = (async () => {
      const [map48, map96] = await Promise.all([
        getAlphaMapFromAsset(watermarkBg48Url, 48),
        getAlphaMapFromAsset(watermarkBg96Url, 96),
      ])
      watermarkAlphaMap48 = map48
      watermarkAlphaMap96 = map96
    })().catch((error) => {
      watermarkAssetPromise = null
      throw error
    })
  }
  await watermarkAssetPromise
}

const detectWatermarkConfig = (imageWidth: number, imageHeight: number): WatermarkConfig =>
  imageWidth > 1024 && imageHeight > 1024
    ? { logoSize: 96, marginRight: 64, marginBottom: 64 }
    : { logoSize: 48, marginRight: 32, marginBottom: 32 }

const calculateWatermarkPosition = (
  imageWidth: number,
  imageHeight: number,
  config: WatermarkConfig
): WatermarkPosition => ({
  x: imageWidth - config.marginRight - config.logoSize,
  y: imageHeight - config.marginBottom - config.logoSize,
  width: config.logoSize,
  height: config.logoSize,
})

const removeWatermarkPixels = (
  imageData: ImageData,
  alphaMap: Float32Array,
  position: WatermarkPosition
) => {
  const { x, y, width, height } = position
  const maxWidth = imageData.width
  const maxHeight = imageData.height
  if (x < 0 || y < 0 || x + width > maxWidth || y + height > maxHeight) return

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const alphaIndex = row * width + col
      let alpha = alphaMap[alphaIndex]
      if (alpha < WATERMARK_ALPHA_THRESHOLD) continue

      alpha = Math.min(alpha, WATERMARK_MAX_ALPHA)
      const oneMinusAlpha = 1 - alpha
      const imageIndex = ((y + row) * maxWidth + (x + col)) * 4

      for (let channel = 0; channel < 3; channel += 1) {
        const watermarked = imageData.data[imageIndex + channel]
        const original = (watermarked - alpha * WATERMARK_LOGO_VALUE) / oneMinusAlpha
        imageData.data[imageIndex + channel] = Math.max(0, Math.min(255, Math.round(original)))
      }
    }
  }
}

const canvasToBlob = async (canvas: HTMLCanvasElement, type: string) =>
  await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas 转换图片失败"))
        return
      }
      resolve(blob)
    }, type)
  })

const removeGeminiWatermarkFromImageElement = async (image: HTMLImageElement) => {
  await ensureWatermarkAssetsLoaded()
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) throw new Error("无法创建图片处理画布上下文")

  context.drawImage(image, 0, 0, width, height)

  let imageData: ImageData
  try {
    imageData = context.getImageData(0, 0, width, height)
  } catch {
    throw new Error("图片像素读取失败，可能被跨域策略限制")
  }

  const config = detectWatermarkConfig(width, height)
  const position = calculateWatermarkPosition(width, height, config)
  const alphaMap = config.logoSize === 96 ? watermarkAlphaMap96 : watermarkAlphaMap48

  if (!alphaMap) throw new Error("水印模板未就绪")

  removeWatermarkPixels(imageData, alphaMap, position)
  context.putImageData(imageData, 0, 0)
  return await canvasToBlob(canvas, "image/png")
}

const removeGeminiWatermarkFromBlob = async (sourceBlob: Blob) => {
  const image = await loadImageFromBlob(sourceBlob)
  return await removeGeminiWatermarkFromImageElement(image)
}

const fetchImageBlobInBackground = async (url: string) => {
  const response = (await browser.runtime.sendMessage({
    type: FETCH_IMAGE_BLOB_MESSAGE,
    url,
    referrer: location.href,
  })) as FetchImageBlobResponse | undefined

  if (!response) {
    throw new Error("后台取图无响应")
  }
  if (!response.ok) {
    throw new Error(response.error || "后台取图失败")
  }

  if (typeof response.dataUrl !== "string" || !response.dataUrl.startsWith("data:")) {
    throw new Error("后台返回图片数据格式异常")
  }

  const blobResponse = await fetch(response.dataUrl)
  if (!blobResponse.ok) {
    throw new Error(`后台图片数据解析失败(${blobResponse.status})`)
  }
  return await blobResponse.blob()
}

const removeGeminiWatermarkFromUrl = async (url: string) => {
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`本地图片读取失败(${response.status})`)
    }
    const blob = await response.blob()
    return await removeGeminiWatermarkFromBlob(blob)
  }

  try {
    const blob = await fetchImageBlobInBackground(url)
    return await removeGeminiWatermarkFromBlob(blob)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`后台取图失败: ${message}`)
  }
}

const debounce = <T extends (...args: unknown[]) => void>(fn: T, waitMs: number): T => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, waitMs)
  }) as T
}

const autoProcessingQueue = new Set<HTMLImageElement>()
const processedBlobUrlMap = new WeakMap<HTMLImageElement, string>()
let autoWatermarkObserverStarted = false

const processSingleGeminiImage = async (image: HTMLImageElement) => {
  if (autoProcessingQueue.has(image)) return
  if (image.dataset[WATERMARK_PROCESSED_STATE_KEY] === "true") return

  const selectedUrl = selectBestImageUrl(collectOriginalImageCandidates(image))
  if (!selectedUrl) return

  autoProcessingQueue.add(image)
  image.dataset[WATERMARK_PROCESSED_STATE_KEY] = "processing"

  try {
    const cleanBlob = await removeGeminiWatermarkFromUrl(selectedUrl)
    const processedUrl = URL.createObjectURL(cleanBlob)
    const oldProcessedUrl = processedBlobUrlMap.get(image)
    if (oldProcessedUrl) {
      URL.revokeObjectURL(oldProcessedUrl)
    }

    processedBlobUrlMap.set(image, processedUrl)
    image.dataset.eacOriginalUrl = selectedUrl
    image.dataset[WATERMARK_PROCESSED_STATE_KEY] = "true"
    image.srcset = ""
    image.src = processedUrl
  } catch {
    image.dataset[WATERMARK_PROCESSED_STATE_KEY] = "failed"
  } finally {
    autoProcessingQueue.delete(image)
  }
}

const processDisplayedGeminiImages = () => {
  for (const image of findGeminiGeneratedImages()) {
    if (image.dataset[WATERMARK_PROCESSED_STATE_KEY] === "true") continue
    if (image.dataset[WATERMARK_PROCESSED_STATE_KEY] === "processing") continue
    void processSingleGeminiImage(image)
  }
}

const startAutoWatermarkRemover = async () => {
  if (autoWatermarkObserverStarted) return
  autoWatermarkObserverStarted = true

  try {
    await ensureWatermarkAssetsLoaded()
  } catch (error) {
    console.warn("[Enhance AI Chat] watermark assets failed to load", error)
    return
  }

  processDisplayedGeminiImages()
  const debouncedProcess = debounce(processDisplayedGeminiImages, AUTO_PROCESS_DEBOUNCE_MS)
  const root = document.body || document.documentElement
  const observer = new MutationObserver(() => {
    debouncedProcess()
  })

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "class"],
  })
}

const downloadWatermarkFreeChatImages = async (
  urls: string[],
  setStatus: (message: string, isError?: boolean) => void
) => {
  const chatBase = toSafeFileName(getChatTitle())
  let success = 0
  let failed = 0
  let lastErrorMessage = ""

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index]
    setStatus(`图片处理中 ${index + 1}/${urls.length}`)
    try {
      const cleanBlob = await removeGeminiWatermarkFromUrl(url)
      const filename = `${chatBase}-image-${String(index + 1).padStart(2, "0")}.png`
      triggerBlobDownload(filename, cleanBlob)
      success += 1
      await wait(IMAGE_DOWNLOAD_THROTTLE_MS)
    } catch (error) {
      failed += 1
      lastErrorMessage = error instanceof Error ? error.message : String(error)
    }
  }

  if (failed > 0) {
    const detail = lastErrorMessage ? `，最近错误：${lastErrorMessage}` : ""
    setStatus(`图片下载完成 ${success}/${urls.length}，失败 ${failed} 张${detail}`, true)
    return
  }
  setStatus(`图片下载完成，共 ${success} 张`)
}

const ensureStyle = () => {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 260px;
      z-index: 2147483647;
      border-radius: 12px;
      border: 1px solid rgba(30, 41, 59, 0.35);
      background: rgba(15, 23, 42, 0.94);
      color: #e2e8f0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      box-shadow: 0 12px 24px rgba(2, 6, 23, 0.35);
      backdrop-filter: blur(8px);
    }
    #${PANEL_ID} .eac-head {
      padding: 10px 12px 6px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    #${PANEL_ID} .eac-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 10px 10px;
    }
    #${PANEL_ID} .eac-button {
      border: 1px solid rgba(148, 163, 184, 0.4);
      background: rgba(30, 41, 59, 0.8);
      color: #e2e8f0;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.35;
      padding: 8px 10px;
      cursor: pointer;
      text-align: left;
    }
    #${PANEL_ID} .eac-button:hover {
      background: rgba(51, 65, 85, 0.9);
    }
    #${PANEL_ID} .eac-status {
      border-top: 1px solid rgba(148, 163, 184, 0.25);
      padding: 8px 10px;
      font-size: 11px;
      color: #cbd5e1;
      min-height: 30px;
    }
    #${PANEL_ID} .eac-status[data-error="1"] {
      color: #fca5a5;
    }
  `
  document.head.append(style)
}

const ensurePanel = () => {
  if (document.getElementById(PANEL_ID)) return

  const root = document.createElement("aside")
  root.id = PANEL_ID

  const head = document.createElement("div")
  head.className = "eac-head"
  head.textContent = "Enhance AI Chat"
  root.append(head)

  const actions = document.createElement("div")
  actions.className = "eac-actions"
  root.append(actions)

  const status = document.createElement("div")
  status.className = "eac-status"
  status.textContent = "就绪"

  const setStatus = (message: string, isError = false) => {
    status.textContent = message
    status.dataset.error = isError ? "1" : "0"
  }

  const createButton = (label: string, onClick: () => void | Promise<void>) => {
    const button = document.createElement("button")
    button.className = "eac-button"
    button.type = "button"
    button.textContent = label
    button.addEventListener("click", () => {
      void onClick()
    })
    actions.append(button)
  }

  createButton("导出聊天 Markdown（高保真）", async () => {
    const messages = extractChatMessages()
    if (messages.length === 0) {
      setStatus("未找到可导出的聊天内容", true)
      return
    }
    const markdown = buildMarkdown(messages)
    const filename = `${toSafeFileName(getChatTitle())}-${getTimestamp()}.md`
    downloadTextFile(filename, markdown, "text/markdown;charset=utf-8")
    setStatus(`已导出 ${messages.length} 条消息`)
  })

  createButton("导出到 Gmail 草稿", async () => {
    const messages = extractChatMessages()
    if (messages.length === 0) {
      setStatus("未找到可导出的聊天内容", true)
      return
    }
    const subject = `[Gemini] ${getChatTitle()}`
    let body = buildGmailBody(messages)
    if (body.length > 12000) {
      body = `${body.slice(0, 12000)}\n\n[内容过长，已截断。建议使用 Markdown 导出完整记录]`
      setStatus("聊天较长，已截断后写入 Gmail 草稿")
    } else {
      setStatus("已打开 Gmail 草稿窗口")
    }
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, "_blank", "noopener,noreferrer")
  })

  createButton("下载图片", async () => {
    const urls = collectGeminiOriginalImageUrls()
    if (urls.length === 0) {
      setStatus("未找到可下载的 Gemini 图片", true)
      return
    }

    try {
      await ensureWatermarkAssetsLoaded()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus(`去水印模板加载失败: ${message}`, true)
      return
    }

    await downloadWatermarkFreeChatImages(urls, setStatus)
  })

  root.append(status)
  document.documentElement.append(root)
}

export default defineContentScript({
  matches: ["https://gemini.google.com/*"],
  runAt: "document_idle",
  main() {
    if (window.top !== window.self) return
    ensureStyle()
    ensurePanel()
    void startAutoWatermarkRemover()
  },
})
