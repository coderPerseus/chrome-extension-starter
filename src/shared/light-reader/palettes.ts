export interface LightReaderPalette {
  id: string
  name: string
  description: string
  colors: {
    background: string
    surface: string
    text: string
    muted: string
    border: string
    primary: string
    onPrimary: string
    link: string
    codeBackground: string
  }
}

export const LIGHT_READER_PALETTES: LightReaderPalette[] = [
  {
    id: "guji",
    name: "古籍米黄",
    description: "仿老式线装书的温润纸感",
    colors: {
      background: "#f4ecd8",
      surface: "#fbf4e3",
      text: "#3e3328",
      muted: "#7a6855",
      border: "#ddd0b6",
      primary: "#9c6f41",
      onPrimary: "#fff8ea",
      link: "#6f4d31",
      codeBackground: "#efe2c9",
    },
  },
  {
    id: "tech-blue",
    name: "科技蓝",
    description: "清爽科技感浅蓝界面",
    colors: {
      background: "#edf5ff",
      surface: "#f8fbff",
      text: "#16253a",
      muted: "#546b8a",
      border: "#d6e3f4",
      primary: "#2f6fec",
      onPrimary: "#f8fbff",
      link: "#1f5bcc",
      codeBackground: "#e7f0fb",
    },
  },
  {
    id: "mono-minimal",
    name: "极简黑白",
    description: "黑白灰中性风格，干净利落",
    colors: {
      background: "#f8f8f8",
      surface: "#ffffff",
      text: "#161616",
      muted: "#666666",
      border: "#dddddd",
      primary: "#111111",
      onPrimary: "#ffffff",
      link: "#222222",
      codeBackground: "#f1f1f1",
    },
  },
  {
    id: "latte",
    name: "Latte",
    description: "高人气奶咖浅色，柔和耐看",
    colors: {
      background: "#f7f2ea",
      surface: "#fffbf5",
      text: "#3b3128",
      muted: "#76695c",
      border: "#e3d8c8",
      primary: "#b27d4d",
      onPrimary: "#fff9f2",
      link: "#7a5a9e",
      codeBackground: "#f0e6d8",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    description: "经典护眼浅色方案，长文友好",
    colors: {
      background: "#fdf6e3",
      surface: "#fff9ea",
      text: "#586e75",
      muted: "#839496",
      border: "#e6ddc5",
      primary: "#268bd2",
      onPrimary: "#fdf6e3",
      link: "#2f7fb6",
      codeBackground: "#eee8d5",
    },
  },
  {
    id: "linen",
    name: "Linen",
    description: "奶白纸感，适合长时间阅读",
    colors: {
      background: "#f7f3ea",
      surface: "#fffaf0",
      text: "#2b2b2b",
      muted: "#6b655c",
      border: "#ded8ca",
      primary: "#ac7c33",
      onPrimary: "#fffaf0",
      link: "#2e6aa5",
      codeBackground: "#f2ead9",
    },
  },
  {
    id: "sakura",
    name: "Sakura Mist",
    description: "粉白暖调，柔和不刺眼",
    colors: {
      background: "#fbf3f5",
      surface: "#fff8fa",
      text: "#352d31",
      muted: "#786a71",
      border: "#e9dbe0",
      primary: "#c15d7a",
      onPrimary: "#fff8fa",
      link: "#9c3f71",
      codeBackground: "#f8eaf0",
    },
  },
  {
    id: "mint",
    name: "Mint Breeze",
    description: "青绿薄荷，清爽明亮",
    colors: {
      background: "#eef9f6",
      surface: "#f6fffd",
      text: "#163633",
      muted: "#4c6d68",
      border: "#cde2db",
      primary: "#178f7a",
      onPrimary: "#f6fffd",
      link: "#116f9d",
      codeBackground: "#def0ea",
    },
  },
  {
    id: "sunrise",
    name: "Sunrise Sand",
    description: "暖沙与琥珀，提升可读对比",
    colors: {
      background: "#fff6e8",
      surface: "#fffbf3",
      text: "#3a2b1d",
      muted: "#7f6a50",
      border: "#e8d5ba",
      primary: "#d4771d",
      onPrimary: "#fff9f3",
      link: "#9b5a1b",
      codeBackground: "#f8ebd6",
    },
  },
  {
    id: "nord",
    name: "Nordic Frost",
    description: "冰蓝灰阶，信息结构清晰",
    colors: {
      background: "#f1f5f9",
      surface: "#f8fbff",
      text: "#1c2735",
      muted: "#5a6f84",
      border: "#d5e0ea",
      primary: "#3a6ea5",
      onPrimary: "#f8fbff",
      link: "#2a4f76",
      codeBackground: "#e7eef5",
    },
  },
  {
    id: "clay",
    name: "Clay Ink",
    description: "米黄与陶土，复古编辑感",
    colors: {
      background: "#f4efe5",
      surface: "#fcf8ef",
      text: "#2f261f",
      muted: "#66574b",
      border: "#ddd1be",
      primary: "#a15b3f",
      onPrimary: "#fff7ec",
      link: "#79554a",
      codeBackground: "#eee4d3",
    },
  },
]

const paletteMap = new Map(LIGHT_READER_PALETTES.map((palette) => [palette.id, palette]))

export const getLightReaderPalette = (paletteId: string) => {
  return paletteMap.get(paletteId) ?? LIGHT_READER_PALETTES[0]
}
