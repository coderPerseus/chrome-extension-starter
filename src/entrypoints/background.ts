import { RPCHandler } from "@orpc/server/message-port";
import { GUIDE_PAGE_PATH } from "@/constants/onboarding";
import { ORPC_PORT_NAME } from "@/shared/orpc/constants";
import { router } from "@/shared/orpc/router";

const handler = new RPCHandler(router);

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== ORPC_PORT_NAME) return;
    if (port.sender?.id !== browser.runtime.id) {
      console.warn("[oRPC] rejected port", {
        name: port.name,
        sender: port.sender,
      });
      port.disconnect();
      return;
    }
    handler.upgrade(port);
  });

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== "install") return;
    const url = browser.runtime.getURL(GUIDE_PAGE_PATH);
    browser.tabs.create({ url }).catch((error) => {
      console.warn("[Guide] failed to open welcome page", error);
    });
  });

  console.log("oRPC background ready", { id: browser.runtime.id });
});
