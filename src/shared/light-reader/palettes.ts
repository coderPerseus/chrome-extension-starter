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
