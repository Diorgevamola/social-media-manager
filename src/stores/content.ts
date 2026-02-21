import { create } from 'zustand'
import type { ContentPost, PostType, PostStatus } from '@/types/database'

interface ContentState {
  posts: ContentPost[]
  isLoading: boolean
  error: string | null

  setPosts: (posts: ContentPost[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  fetchPosts: (filters?: { status?: PostStatus; postType?: PostType }) => Promise<void>
  createPost: (post: Partial<ContentPost> & { post_type: PostType }) => Promise<ContentPost | null>
  updatePost: (id: string, updates: Partial<ContentPost>) => Promise<ContentPost | null>
  deletePost: (id: string) => Promise<boolean>
}

export const useContentStore = create<ContentState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  setPosts: (posts) => set({ posts }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchPosts: async (filters) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.postType) params.set('postType', filters.postType)

      const res = await fetch(`/api/content/posts?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch posts')

      const data = await res.json()
      set({ posts: data.posts, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      set({ error: message, isLoading: false })
    }
  },

  createPost: async (postData) => {
    set({ error: null })
    try {
      const res = await fetch('/api/content/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      })

      if (!res.ok) throw new Error('Failed to create post')

      const data = await res.json()
      const newPost = data.post as ContentPost
      set({ posts: [newPost, ...get().posts] })
      return newPost
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      set({ error: message })
      return null
    }
  },

  updatePost: async (id, updates) => {
    set({ error: null })
    try {
      const res = await fetch('/api/content/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (!res.ok) throw new Error('Failed to update post')

      const data = await res.json()
      const updatedPost = data.post as ContentPost
      set({
        posts: get().posts.map((p) => (p.id === id ? updatedPost : p)),
      })
      return updatedPost
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      set({ error: message })
      return null
    }
  },

  deletePost: async (id) => {
    set({ error: null })
    try {
      const res = await fetch(`/api/content/posts?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete post')

      set({ posts: get().posts.filter((p) => p.id !== id) })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      set({ error: message })
      return false
    }
  },
}))
