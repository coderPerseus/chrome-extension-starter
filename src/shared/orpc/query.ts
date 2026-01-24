import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createExtensionClient } from "@/shared/orpc/extension";

const createUtils = () => createTanstackQueryUtils(createExtensionClient());

type OrpcUtils = ReturnType<typeof createUtils>;

let cached: OrpcUtils | null = null;
/** 自动处理缓存、去重、重试、loading/error 状态、失效刷新 */
export const getOrpc = () => {
  if (!cached) {
    cached = createUtils();
  }
  return cached;
};
