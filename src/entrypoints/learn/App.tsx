import { useMemo, useState } from "react"

type UiLocale = "zh" | "en"

const UI_LOCALE_KEY = "light-reader:ui-locale"

const normalizeUiLocale = (value: unknown): UiLocale => {
  return value === "en" ? "en" : "zh"
}

const getLocaleFromUrl = (): UiLocale | null => {
  const params = new URLSearchParams(window.location.search)
  const lang = params.get("lang")
  if (!lang) return null
  return normalizeUiLocale(lang)
}

const getUiLanguage = () => {
  const globals = globalThis as typeof globalThis & {
    browser?: { i18n?: { getUILanguage?: () => string } }
    chrome?: { i18n?: { getUILanguage?: () => string } }
  }

  return globals.browser?.i18n?.getUILanguage?.() ?? globals.chrome?.i18n?.getUILanguage?.() ?? ""
}

const getDefaultUiLocale = (): UiLocale => {
  return getUiLanguage().toLowerCase().startsWith("zh") ? "zh" : "en"
}

const CONTENT = {
  zh: {
    title: "为什么阅读场景更推荐浅色模式？",
    subtitle:
      "基于公开研究：暗黑模式并非一定伤眼，但在大量文字阅读中，浅色（黑字白底/正极性）通常更清晰、更快、更不易疲劳。",
    sections: [
      {
        title: "暗黑模式在阅读中的潜在问题",
        bullets: [
          "对白字黑底（负极性）来说，不少研究发现阅读速度和校对准确率通常低于黑字白底（正极性）。",
          "负极性会让瞳孔平均更大，可能降低细小文字的清晰度，长时间阅读更容易出现吃力感。",
          "在强光环境下，暗黑模式的对比和细节分辨也可能不如浅色模式稳定。",
        ],
      },
      {
        title: "浅色模式的主要好处",
        bullets: [
          "在校对、文档阅读、长文浏览里，正极性通常有更好的阅读表现与速度。",
          "更有利于细字、表格、代码等高信息密度内容的辨识。",
          "对大多数白天办公场景更友好，视觉层级更容易建立。",
        ],
      },
      {
        title: "科学上更准确的结论",
        bullets: [
          "“暗黑模式会直接伤眼”并不是当前研究的主流结论；研究更多聚焦在可读性、疲劳和任务效率差异。",
          "在夜间、低照度或高畏光人群中，暗黑模式可能更舒适。",
          "实用建议：文字密集任务优先浅色；夜间短时浏览可按舒适度切暗色，并坚持 20-20-20 用眼习惯。",
        ],
      },
    ],
    refsTitle: "参考资料（英文原文）",
    refs: [
      {
        title:
          "Text-background polarity affects performance irrespective of ambient illumination and colour contrast (Ergonomics, 2007)",
        url: "https://pubmed.ncbi.nlm.nih.gov/17510822/",
      },
      {
        title:
          "The Positive Polarity Advantage in Reading Performance: A Review (Ergonomics, 2009)",
        url: "https://pubmed.ncbi.nlm.nih.gov/19562598/",
      },
      {
        title:
          "Display polarity and pupil diameter: implications for reading and visual comfort (Ergonomics, 2013)",
        url: "https://pubmed.ncbi.nlm.nih.gov/23654206/",
      },
      {
        title:
          "Display polarity and visual performance under daytime and nighttime lighting conditions (Ergonomics, 2014)",
        url: "https://pubmed.ncbi.nlm.nih.gov/25135324/",
      },
      {
        title:
          "Immediate effects of dark mode and light mode on visual fatigue in tablet users (IJERPH, 2025)",
        url: "https://pubmed.ncbi.nlm.nih.gov/40283833/",
      },
      {
        title: "Computer Vision Syndrome - American Optometric Association",
        url: "https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome",
      },
    ],
  },
  en: {
    title: "Why Light Mode Is Often Better for Reading",
    subtitle:
      "Based on published research: dark mode is not automatically harmful, but for dense reading tasks, light mode (positive polarity) is usually clearer and faster.",
    sections: [
      {
        title: "Potential drawbacks of dark mode for reading",
        bullets: [
          "Across multiple studies, white-on-black (negative polarity) often shows slower reading and weaker proofreading performance than black-on-white (positive polarity).",
          "Negative polarity tends to produce larger pupil sizes, which can reduce fine-detail sharpness and increase visual effort for small text.",
          "In bright environments, dark mode can be less stable for contrast perception in text-heavy layouts.",
        ],
      },
      {
        title: "Main benefits of light mode",
        bullets: [
          "For proofreading, document reading, and long-form content, positive polarity often yields better reading performance.",
          "It is generally better for dense information like small text, tables, and code.",
          "In daytime office conditions, visual hierarchy is usually easier to parse.",
        ],
      },
      {
        title: "Nuanced takeaway from evidence",
        bullets: [
          "Current research does not mainly frame dark mode as direct eye damage; it mostly compares readability, fatigue, and task performance.",
          "Dark mode can still feel better in low-light environments or for users with light sensitivity.",
          "Practical rule: use light mode for text-heavy work, use dark mode selectively at night, and follow the 20-20-20 break habit.",
        ],
      },
    ],
    refsTitle: "References",
    refs: [
      {
        title:
          "Text-background polarity affects performance irrespective of ambient illumination and colour contrast (Ergonomics, 2007)",
        url: "https://pubmed.ncbi.nlm.nih.gov/17510822/",
      },
      {
        title:
          "The Positive Polarity Advantage in Reading Performance: A Review (Ergonomics, 2009)",
        url: "https://pubmed.ncbi.nlm.nih.gov/19562598/",
      },
      {
        title:
          "Display polarity and pupil diameter: implications for reading and visual comfort (Ergonomics, 2013)",
        url: "https://pubmed.ncbi.nlm.nih.gov/23654206/",
      },
      {
        title:
          "Display polarity and visual performance under daytime and nighttime lighting conditions (Ergonomics, 2014)",
        url: "https://pubmed.ncbi.nlm.nih.gov/25135324/",
      },
      {
        title:
          "Immediate effects of dark mode and light mode on visual fatigue in tablet users (IJERPH, 2025)",
        url: "https://pubmed.ncbi.nlm.nih.gov/40283833/",
      },
      {
        title: "Computer Vision Syndrome - American Optometric Association",
        url: "https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome",
      },
    ],
  },
} as const

const getInitialLocale = () => {
  const fromUrl = getLocaleFromUrl()
  if (fromUrl) return fromUrl
  return getDefaultUiLocale()
}

function App() {
  const [locale, setLocale] = useState<UiLocale>(getInitialLocale())

  const content = useMemo(() => CONTENT[locale], [locale])

  const toggleLocale = async () => {
    const nextLocale: UiLocale = locale === "zh" ? "en" : "zh"
    setLocale(nextLocale)

    await browser.storage.local.set({
      [UI_LOCALE_KEY]: nextLocale,
    })
  }

  return (
    <main className="learn-shell">
      <header className="learn-header">
        <h1>{content.title}</h1>
        <button
          type="button"
          className="lang-toggle"
          onClick={() => {
            void toggleLocale()
          }}
        >
          中 / EN
        </button>
      </header>
      <p className="subtitle">{content.subtitle}</p>

      <section className="sections">
        {content.sections.map((section) => (
          <article key={section.title} className="card">
            <h2>{section.title}</h2>
            <ul>
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="card refs">
        <h2>{content.refsTitle}</h2>
        <ol>
          {content.refs.map((ref) => (
            <li key={ref.url}>
              <a href={ref.url} target="_blank" rel="noreferrer">
                {ref.title}
              </a>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}

export default App
