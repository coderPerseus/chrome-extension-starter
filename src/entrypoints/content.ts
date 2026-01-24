import { createExtensionClient } from "@/shared/orpc/extension"

export default defineContentScript({
  matches: ["*://*.google.com/*"],
  main() {
    const client = createExtensionClient()
    client
      .ping()
      .then((value) => {
        console.log("[oRPC] content ping", value)
      })
      .catch((error) => {
        console.warn("[oRPC] content ping failed", error)
      })
  },
})
