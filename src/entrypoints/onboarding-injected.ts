import {
  GUIDE_ACTIONS_ID,
  GUIDE_COPY_BUTTON_ID,
  GUIDE_COPY_BUTTON_LABEL,
  GUIDE_MESSAGE_SOURCE,
  GUIDE_MESSAGE_TYPE,
  GUIDE_ROOT_ID,
} from "@/constants/onboarding";

export default defineUnlistedScript(() => {
  const rootId = GUIDE_ROOT_ID;
  const actionsId = GUIDE_ACTIONS_ID;

  const actionsRoot =
    document.getElementById(actionsId) ??
    document.body ??
    document.documentElement;
  if (!actionsRoot) return;

  if (document.getElementById(GUIDE_COPY_BUTTON_ID)) return;

  const button = document.createElement("button");
  button.id = GUIDE_COPY_BUTTON_ID;
  button.type = "button";
  button.textContent = GUIDE_COPY_BUTTON_LABEL;
  button.addEventListener("click", async () => {
    const markdown = document.getElementById(rootId)?.dataset.markdown ?? "";
    window.postMessage(
      { source: GUIDE_MESSAGE_SOURCE, type: GUIDE_MESSAGE_TYPE, markdown },
      "*",
    );
  });

  actionsRoot.prepend(button);
});
