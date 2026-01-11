import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { createExtensionClient } from "@/shared/orpc/extension"

const createUtils = () => createTanstackQueryUtils(createExtensionClient())

type OrpcUtils = ReturnType<typeof createUtils>

let cached: OrpcUtils | null = null

export const getOrpc = () => {
  if (!cached) {
    cached = createUtils()
  }
  return cached
}
