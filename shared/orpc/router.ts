import { os } from "@orpc/server"

const COUNTER_KEY = "orpc:counter"

const getCounter = async () => {
  const stored = await browser.storage.local.get(COUNTER_KEY)
  const value = stored[COUNTER_KEY]
  return typeof value === "number" ? value : 0
}

const setCounter = async (value: number) => {
  await browser.storage.local.set({ [COUNTER_KEY]: value })
  return value
}

const incrementCounter = async () => {
  const current = await getCounter()
  return setCounter(current + 1)
}

export const router = os.router({
  ping: os.handler(() => "pong"),
  counter: os.router({
    get: os.handler(() => getCounter()),
    increment: os.handler(() => incrementCounter()),
  }),
})

export type AppRouter = typeof router
