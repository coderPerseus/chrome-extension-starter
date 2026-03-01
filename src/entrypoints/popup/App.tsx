import {
  EAC_ONBOARDING_SEEN_STORAGE_KEY,
  GEMINI_POPUP_ACTIONS,
  GEMINI_POPUP_ACTION_MESSAGE,
  type GeminiPopupAction,
  type GeminiPopupActionResponse,
} from "@/shared/messages/gemini-actions";
import { useEffect, useMemo, useState } from "react";

type StatusType = "info" | "success" | "error";

type StatusState = {
  type: StatusType;
  text: string;
};

type PopupActionItem = {
  action: GeminiPopupAction;
  title: string;
  description: string;
};

const GEMINI_TAB_PATTERN = /^https:\/\/gemini\.google\.com\//i;
const TAB_READY_TIMEOUT_MS = 6000;
const TAB_READY_POLL_INTERVAL_MS = 120;

type TabActionDispatchResult =
  | { type: "ok"; response: GeminiPopupActionResponse }
  | { type: "no_receiver" }
  | { type: "error"; message: string };

const POPUP_ACTIONS: PopupActionItem[] = [
  {
    action: GEMINI_POPUP_ACTIONS.EXPORT_MARKDOWN,
    title: "导出 Markdown",
    description: "高保真导出当前 Gemini 对话",
  },
  {
    action: GEMINI_POPUP_ACTIONS.EXPORT_GMAIL_DRAFT,
    title: "写入 Gmail 草稿",
    description: "一键生成邮件草稿，快速分享",
  },
  {
    action: GEMINI_POPUP_ACTIONS.DOWNLOAD_WATERMARK_FREE_IMAGES,
    title: "下载去水印图片",
    description: "本地算法处理后再下载，数据不上传",
  },
  // {
  //   action: GEMINI_POPUP_ACTIONS.DOWNLOAD_ORIGINAL_IMAGES,
  //   title: "导出原图",
  //   description: "批量触发 Gemini 原图下载按钮",
  // },
];

const getCurrentTab = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const isGeminiTab = (tab: { url?: string } | undefined) => {
  const tabUrl = tab?.url || "";
  return GEMINI_TAB_PATTERN.test(tabUrl);
};

const wait = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const isNoReceiverError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /receiving end does not exist/i.test(message) ||
    /could not establish connection/i.test(message)
  );
};

const waitForTabReady = async (
  tabId: number,
  timeoutMs = TAB_READY_TIMEOUT_MS,
) => {
  const startTime = Date.now();
  while (Date.now() - startTime <= timeoutMs) {
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab.status === "complete") return true;
    } catch {
      return false;
    }
    await wait(TAB_READY_POLL_INTERVAL_MS);
  }
  return false;
};

const dispatchActionToTab = async (
  tabId: number,
  action: GeminiPopupAction,
): Promise<TabActionDispatchResult> => {
  try {
    const response = (await browser.tabs.sendMessage(tabId, {
      type: GEMINI_POPUP_ACTION_MESSAGE,
      action,
    })) as GeminiPopupActionResponse | undefined;

    if (!response) {
      return {
        type: "error",
        message: "Gemini 页面未响应，请刷新页面后重试",
      };
    }

    return {
      type: "ok",
      response,
    };
  } catch (error) {
    if (isNoReceiverError(error)) {
      return { type: "no_receiver" };
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      type: "error",
      message: `通信失败：${message}`,
    };
  }
};

function App() {
  const [busyAction, setBusyAction] = useState<GeminiPopupAction | null>(null);
  const [status, setStatus] = useState<StatusState>({
    type: "info",
    text: "打开 Gemini 标签页后可直接导入。",
  });
  const [guideChecked, setGuideChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [activeTabIsGemini, setActiveTabIsGemini] = useState(false);

  const isBusy = busyAction !== null;

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storage = await browser.storage.local.get(
          EAC_ONBOARDING_SEEN_STORAGE_KEY,
        );
        const seen = Boolean(storage[EAC_ONBOARDING_SEEN_STORAGE_KEY]);
        setShowGuide(!seen);
      } catch {
        setShowGuide(true);
      } finally {
        setGuideChecked(true);
      }

      try {
        const currentTab = await getCurrentTab();
        setActiveTabIsGemini(isGeminiTab(currentTab));
      } catch {
        setActiveTabIsGemini(false);
      }
    };

    void bootstrap();
  }, []);

  const guideItems = useMemo(
    () => [
      {
        title: "实现原理",
        text: "popup 负责触发操作，Gemini 页面内的 content script 执行导入与导出逻辑。",
      },
      {
        title: "纯本地处理",
        text: "聊天解析、Markdown 生成、图片处理都在你的浏览器本地完成，不走第三方服务器。",
      },
      {
        title: "安全与隐私",
        text: "仅使用下载与标签页权限；你的对话内容不会被扩展上传到外部服务。",
      },
    ],
    [],
  );

  const markGuideAsSeen = async () => {
    try {
      await browser.storage.local.set({
        [EAC_ONBOARDING_SEEN_STORAGE_KEY]: true,
      });
    } catch {
      // no-op
    }
    setShowGuide(false);
  };

  const runAction = async (action: GeminiPopupAction) => {
    if (isBusy) return;

    setBusyAction(action);
    setStatus({ type: "info", text: "正在执行，请稍候..." });

    try {
      const currentTab = await getCurrentTab();
      if (!currentTab?.id) {
        setStatus({ type: "error", text: "未找到当前标签页。" });
        return;
      }

      const onGemini = isGeminiTab(currentTab);
      setActiveTabIsGemini(onGemini);
      if (!onGemini) {
        setStatus({
          type: "error",
          text: "请先切换到 gemini.google.com 再执行操作。",
        });
        return;
      }

      let pingResult = await dispatchActionToTab(
        currentTab.id,
        GEMINI_POPUP_ACTIONS.PING,
      );
      if (pingResult.type === "no_receiver") {
        setStatus({ type: "info", text: "正在连接 Gemini 页面，请稍候..." });
        await waitForTabReady(currentTab.id);
        pingResult = await dispatchActionToTab(
          currentTab.id,
          GEMINI_POPUP_ACTIONS.PING,
        );
      }

      if (pingResult.type === "no_receiver") {
        setStatus({
          type: "error",
          text: "当前标签页尚未注入扩展脚本，请刷新 Gemini 页面后重试。",
        });
        return;
      }

      if (pingResult.type === "error") {
        setStatus({ type: "error", text: pingResult.message });
        return;
      }

      const actionResult = await dispatchActionToTab(currentTab.id, action);
      if (actionResult.type === "no_receiver") {
        setStatus({
          type: "error",
          text: "通信连接已中断，请刷新 Gemini 页面后重试。",
        });
        return;
      }
      if (actionResult.type === "error") {
        setStatus({ type: "error", text: actionResult.message });
        return;
      }

      const response = actionResult.response;
      setStatus({
        type: response.ok ? "success" : "error",
        text: response.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ type: "error", text: `操作失败：${message}` });
    } finally {
      setBusyAction(null);
    }
  };

  const openGeminiTab = async () => {
    await browser.tabs.create({ url: "https://gemini.google.com/" });
    setStatus({ type: "info", text: "已打开 Gemini 标签页。" });
  };

  if (!guideChecked) {
    return (
      <main className="popup-shell loading-state">
        <div className="loading-card">正在加载...</div>
      </main>
    );
  }

  if (showGuide) {
    return (
      <main className="popup-shell">
        <section className="guide-card">
          <p className="eyebrow">安装成功</p>
          <h1>Enhance AI Chat 已就绪</h1>
          <p className="lead">
            当前版本采用纯本地执行方案，默认浅色体验，交互风格贴近 ChatGPT。
          </p>
          <ul className="guide-list">
            {guideItems.map((item) => (
              <li key={item.title}>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
          <div className="guide-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => void openGeminiTab()}
            >
              打开 Gemini
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => void markGuideAsSeen()}
            >
              我已了解，开始使用
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="popup-shell">
      <section className="panel-card">
        <header className="panel-head">
          <div>
            <p className="eyebrow">Gemini 导入</p>
            <h1>Enhance AI Chat</h1>
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={() => setShowGuide(true)}
          >
            原理说明
          </button>
        </header>

        <p className={`tab-indicator ${activeTabIsGemini ? "ok" : "warn"}`}>
          {activeTabIsGemini
            ? "已连接 Gemini 当前标签页"
            : "请先切到 gemini.google.com"}
        </p>

        <div className="action-list">
          {POPUP_ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              className="action-btn"
              onClick={() => void runAction(item.action)}
              disabled={isBusy}
            >
              <span className="action-title">{item.title}</span>
              <span className="action-desc">{item.description}</span>
              {busyAction === item.action ? (
                <span className="action-loading">执行中...</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className={`status status-${status.type}`}>{status.text}</div>
      </section>
    </main>
  );
}

export default App;
