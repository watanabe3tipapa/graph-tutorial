import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never

if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== 'function') {
  const store = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  })
}
