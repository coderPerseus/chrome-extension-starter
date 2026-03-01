import { EAC_ONBOARDING_SEEN_STORAGE_KEY } from "@/shared/messages/gemini-actions"
import { useEffect, useState } from "react"

function App() {
  const [status, setStatus] = useState("点击下方按钮开始使用。")

  useEffect(() => {
    void browser.storage.local.set({ [EAC_ONBOARDING_SEEN_STORAGE_KEY]: true })
  }, [])

  const openGemini = async () => {
    await browser.tabs.create({ url: "https://gemini.google.com/" })
    setStatus("已打开 Gemini。你可以点击浏览器工具栏中的扩展图标执行导入操作。")
  }

  return (
    <main className="onboarding-shell">
      <section className="hero-card">
        <p className="eyebrow">安装成功</p>
        <h1>Enhance AI Chat 已完成安装</h1>
        <p className="lead">
          Gemini 导入入口已迁移到 popup。无需页面右下角浮层，全部通过扩展弹窗完成。
        </p>
      </section>

      <section className="content-card">
        <h2>当前实现原理</h2>
        <ol>
          <li>在 Gemini 页面内读取当前会话 DOM，提取消息和图片链接。</li>
          <li>点击 popup 的动作按钮后，由 content script 在本地执行导入/导出。</li>
          <li>图片去水印使用本地 Canvas 处理，再调用浏览器下载能力保存。</li>
        </ol>

        <h2>安全与隐私</h2>
        <ul>
          <li>所有处理均在本地浏览器执行，不上传你的聊天内容。</li>
          <li>仅使用必要扩展权限（下载、标签页、本地存储）。</li>
          <li>当前 UI 已切换为浅色，并统一为 ChatGPT 风格交互。</li>
        </ul>

        <div className="actions">
          <button type="button" className="btn primary" onClick={() => void openGemini()}>
            打开 Gemini 开始导入
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              void browser.storage.local.set({ [EAC_ONBOARDING_SEEN_STORAGE_KEY]: true })
              window.close()
            }}
          >
            我知道了
          </button>
        </div>

        <p className="status" aria-live="polite">
          {status}
        </p>
      </section>
    </main>
  )
}

export default App
