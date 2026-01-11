import { RPCHandler } from "@orpc/server/message-port"
import { ORPC_PORT_NAME } from "@/shared/orpc/constants"
import { router } from "@/shared/orpc/router"

const handler = new RPCHandler(router)

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== ORPC_PORT_NAME) return
    if (port.sender?.id !== browser.runtime.id) {
      console.warn("[oRPC] rejected port", { name: port.name, sender: port.sender })
      port.disconnect()
      return
    }
    handler.upgrade(port)
  })

  console.log("oRPC background ready", { id: browser.runtime.id })
})
