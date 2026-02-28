import watermarkBg48Url from "@/assets/gemini-watermark-bg-48.png"
import watermarkBg96Url from "@/assets/gemini-watermark-bg-96.png"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  role: ChatRole
  text: string
  markdown: string
}

type DownloadImageItem = {
  url: string
  filename: string
}

type DownloadImagesResponse = {
  ok: boolean
  downloaded: number
  errors: string[]
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

const DOWNLOAD_IMAGES_MESSAGE = "EAC_DOWNLOAD_IMAGES"
const FETCH_IMAGE_BLOB_MESSAGE = "EAC_FETCH_IMAGE_BLOB"
const PANEL_ID = "eac-gemini-tools"
const STYLE_ID = "eac-gemini-tools-style"
const VISUAL_CLEAN_CLASS = "eac-visual-clean"
const MESSAGE_SELECTOR = "user-query, model-response"
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

const guessImageExtension = (value: string) => {
  try {
    const pathname = new URL(value, location.href).pathname.toLowerCase()
    const match = pathname.match(/\.(png|jpg|jpeg|webp|gif|bmp|svg|avif)$/)
    if (!match) return "png"
    return match[1] === "jpeg" ? "jpg" : match[1]
  } catch {
    return "png"
  }
}

const getBaseName = (filename: string) => {
  const lastPart = filename.split("/").pop() || filename
  const withoutExt = lastPart.replace(/\.[^.]+$/, "")
  return toSafeFileName(withoutExt || "image")
}

const isLikelyDecorativeImage = (img: HTMLImageElement) => {
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  if (!width || !height) return false
  return width <= 64 && height <= 64
}

const collectGeminiImageUrls = () => {
  const roots = Array.from(document.querySelectorAll<HTMLElement>("model-response"))
  const searchRoots = roots.length > 0 ? roots : [document.documentElement]
  const urls = new Set<string>()

  for (const root of searchRoots) {
    const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"))
    for (const image of images) {
      if (isLikelyDecorativeImage(image)) continue
      const src = image.currentSrc || image.src || image.getAttribute("src") || ""
      if (!src || src.startsWith("data:")) continue
      urls.add(src)
    }
  }

  return Array.from(urls)
}

const createDownloadItems = (urls: string[]): DownloadImageItem[] => {
  const baseFolder = `Enhance-AI-Chat/${toSafeFileName(getChatTitle())}`
  return urls.map((url, index) => ({
    url,
    filename: `${baseFolder}/image-${String(index + 1).padStart(2, "0")}.${guessImageExtension(url)}`,
  }))
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
    setStatus(`去水印处理中 ${index + 1}/${urls.length}`)
    try {
      const cleanBlob = await removeGeminiWatermarkFromUrl(url)
      const filename = `${chatBase}-clean-${String(index + 1).padStart(2, "0")}.png`
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
    setStatus(`去水印下载完成 ${success}/${urls.length}，失败 ${failed} 张${detail}`, true)
    return
  }
  setStatus(`去水印下载完成，共 ${success} 张`)
}

const processLocalFilesForWatermarkRemoval = async (
  files: FileList | null,
  setStatus: (message: string, isError?: boolean) => void
) => {
  if (!files || files.length === 0) return

  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))
  if (imageFiles.length === 0) {
    setStatus("请选择 PNG/JPG/WebP 图片文件", true)
    return
  }

  await ensureWatermarkAssetsLoaded()

  let success = 0
  let failed = 0
  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index]
    setStatus(`本地去水印处理中 ${index + 1}/${imageFiles.length}`)
    try {
      const cleanBlob = await removeGeminiWatermarkFromBlob(file)
      const base = getBaseName(file.name)
      const filename = `${base}-clean-${String(index + 1).padStart(2, "0")}.png`
      triggerBlobDownload(filename, cleanBlob)
      success += 1
      await wait(IMAGE_DOWNLOAD_THROTTLE_MS)
    } catch {
      failed += 1
    }
  }

  if (failed > 0) {
    setStatus(`本地去水印完成 ${success}/${imageFiles.length}，失败 ${failed} 张`, true)
    return
  }
  setStatus(`本地去水印完成，共 ${success} 张`)
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
    #${PANEL_ID} .eac-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      padding: 0 10px 10px;
      color: #cbd5e1;
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
    #${PANEL_ID} .eac-hidden-file-input {
      display: none;
    }
    .${VISUAL_CLEAN_CLASS} [class*="watermark" i],
    .${VISUAL_CLEAN_CLASS} [id*="watermark" i],
    .${VISUAL_CLEAN_CLASS} [data-watermark],
    .${VISUAL_CLEAN_CLASS} [aria-label*="watermark" i],
    .${VISUAL_CLEAN_CLASS} [class*="synthid" i],
    .${VISUAL_CLEAN_CLASS} [aria-label*="synthid" i] {
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
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

  const localFileInput = document.createElement("input")
  localFileInput.className = "eac-hidden-file-input"
  localFileInput.type = "file"
  localFileInput.multiple = true
  localFileInput.accept = "image/png,image/jpeg,image/jpg,image/webp"
  localFileInput.addEventListener("change", () => {
    void processLocalFilesForWatermarkRemoval(localFileInput.files, setStatus).finally(() => {
      localFileInput.value = ""
    })
  })
  root.append(localFileInput)

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

  createButton("下载聊天图片（原图）", async () => {
    const urls = collectGeminiImageUrls()
    if (urls.length === 0) {
      setStatus("未找到可下载的聊天图片", true)
      return
    }

    const items = createDownloadItems(urls)
    try {
      const response = (await browser.runtime.sendMessage({
        type: DOWNLOAD_IMAGES_MESSAGE,
        items,
      })) as DownloadImagesResponse | undefined

      if (!response?.ok) {
        setStatus("图片下载失败，请重试", true)
        return
      }

      if (response.errors.length > 0) {
        setStatus(`下载完成 ${response.downloaded}/${items.length} 张，部分失败`, true)
        return
      }

      setStatus(`已提交 ${response.downloaded} 张图片下载`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus(`图片下载失败: ${message}`, true)
    }
  })

  createButton("下载聊天图片（去水印）", async () => {
    const urls = collectGeminiImageUrls()
    if (urls.length === 0) {
      setStatus("未找到可处理的聊天图片", true)
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

  createButton("本地图片批量去水印", async () => {
    try {
      await ensureWatermarkAssetsLoaded()
      localFileInput.click()
      setStatus("请选择本地图片（支持多选）")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus(`去水印模板加载失败: ${message}`, true)
    }
  })

  const toggleWrap = document.createElement("label")
  toggleWrap.className = "eac-toggle"
  const toggle = document.createElement("input")
  toggle.type = "checkbox"
  toggle.addEventListener("change", () => {
    document.documentElement.classList.toggle(VISUAL_CLEAN_CLASS, toggle.checked)
    if (toggle.checked) {
      setStatus("已启用去可见水印（仅隐藏页面叠加标识）")
      return
    }
    setStatus("已关闭去可见水印")
  })
  const toggleText = document.createElement("span")
  toggleText.textContent = "去可见水印（UI）"
  toggleWrap.append(toggle, toggleText)
  root.append(toggleWrap)

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
  },
})
