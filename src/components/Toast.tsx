import { useEffect } from 'react'
import { create } from 'zustand'

const useToastStore = create<{ message: string | null; id: number; show: (m: string) => void; clear: () => void }>(
  (set) => ({
    message: null,
    id: 0,
    show: (message) => set((s) => ({ message, id: s.id + 1 })),
    clear: () => set({ message: null }),
  }),
)

export const toast = (message: string) => useToastStore.getState().show(message)

export function Toaster() {
  const { message, id, clear } = useToastStore()
  useEffect(() => {
    if (!message) return
    const t = setTimeout(clear, 2600)
    return () => clearTimeout(t)
  }, [message, id, clear])
  return (
    <div aria-live="polite" role="status">
      {message && (
        <div className="toast" key={id}>
          {message}
        </div>
      )}
    </div>
  )
}
