import { create } from 'zustand'

interface ForecastStore {
  version: number
  invalidate: () => void
}

export const useForecastStore = create<ForecastStore>((set) => ({
  version: 0,
  invalidate: () => set((s) => ({ version: s.version + 1 })),
}))
