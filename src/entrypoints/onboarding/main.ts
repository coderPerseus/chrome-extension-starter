import { marked } from "marked";
import { injectScript } from "wxt/utils/inject-script";
import {
  GUIDE_ACTIONS_ID,
  GUIDE_INJECTED_SCRIPT_PATH,
  GUIDE_INTRO_BODY,
  GUIDE_INTRO_TITLE,
  GUIDE_MESSAGE_SOURCE,
  GUIDE_MESSAGE_TYPE,
  GUIDE_ROOT_ID,
  GUIDE_TOAST_DURATION_MS,
  GUIDE_TOAST_ID,
  GUIDE_TOAST_MESSAGE,
} from "@/constants/onboarding";
import readme from "../../../README.md?raw";
import "./style.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Guide root element not found");
}

const markdown = readme.trim();
root.id = GUIDE_ROOT_ID;
root.dataset.markdown = markdown;

const readmeHtml = marked.parse(markdown, { async: false });
root.innerHTML = `
  <div class="wxt-guide-panel" role="dialog" aria-label="新手引导页">
    <div class="wxt-guide-actions" id="${GUIDE_ACTIONS_ID}"></div>
    <div class="wxt-guide-toast" id="${GUIDE_TOAST_ID}" role="status" aria-live="polite"></div>
    <header class="wxt-guide-hero">
      <p class="wxt-guide-kicker">WXT + React 模板</p>
      <h1>${GUIDE_INTRO_TITLE}</h1>
      <p>${GUIDE_INTRO_BODY}</p>
    </header>
    <section class="wxt-guide-readme">
      <h2>README</h2>
      <div class="wxt-guide-markdown">${readmeHtml}</div>
    </section>
  </div>
`;

const toast = document.getElementById(GUIDE_TOAST_ID);
let toastTimer: number | undefined;

const showToast = (message: string) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, GUIDE_TOAST_DURATION_MS);
};

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as {
    source?: string;
    type?: string;
    markdown?: string;
  } | null;
  if (
    !data ||
    data.source !== GUIDE_MESSAGE_SOURCE ||
    data.type !== GUIDE_MESSAGE_TYPE
  )
    return;
  console.log(
    "[WXT Guide] Markdown from injected script:",
    data.markdown ?? "",
  );
  showToast(GUIDE_TOAST_MESSAGE);
});

await injectScript(GUIDE_INJECTED_SCRIPT_PATH, { keepInDom: true });
