import { create } from 'zustand'
import type { InstagramAccount } from '@/types/database'

interface InstagramState {
  accounts: InstagramAccount[]
  selectedAccountId: string | null
  isLoading: boolean
  error: string | null

  setAccounts: (accounts: InstagramAccount[]) => void
  selectAccount: (accountId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchAccounts: () => Promise<void>
}

export const useInstagramStore = create<InstagramState>((set) => ({
  accounts: [],
  selectedAccountId: null,
  isLoading: false,
  error: null,

  setAccounts: (accounts) => set({ accounts }),
  selectAccount: (accountId) => set({ selectedAccountId: accountId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/instagram/accounts')
      if (!res.ok) {
        throw new Error('Failed to fetch accounts')
      }
      const data = await res.json()
      set({ accounts: data.accounts, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      set({ error: message, isLoading: false })
    }
  },
}))
