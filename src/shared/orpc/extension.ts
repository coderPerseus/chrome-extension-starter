import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/message-port"
import type { RouterClient } from "@orpc/server"
import { ORPC_PORT_NAME } from "./constants"
import type { AppRouter } from "./router"

export const createExtensionLink = (name = ORPC_PORT_NAME) => {
  const port = browser.runtime.connect({ name })
  return new RPCLink({ port })
}
// 不带缓存、重试、状态管理。
export const createExtensionClient = (): RouterClient<AppRouter> => {
  return createORPCClient(createExtensionLink())
}
