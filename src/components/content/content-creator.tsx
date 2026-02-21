'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PostTypeSelector } from '@/components/content/post-type-selector'
import { AIGenerator } from '@/components/content/ai-generator'
import { PostEditor } from '@/components/content/post-editor'
import type { PostType } from '@/types/database'
import { Sparkles, PenLine } from 'lucide-react'

interface Profile {
  id: string
  username: string
  display_name: string | null
  profile_picture_url: string | null
}

interface ContentCreatorProps {
  profiles: Profile[]
}

export function ContentCreator({ profiles }: ContentCreatorProps) {
  const [postType, setPostType] = useState<PostType>('post')
  const [generatedContent, setGeneratedContent] = useState<{
    caption: string
    hashtags: string[]
  } | null>(null)

  return (
    <div className="space-y-6">
      {/* Post type selector */}
      <PostTypeSelector value={postType} onChange={setPostType} />

      {/* Content tabs */}
      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor" className="gap-2">
            <PenLine className="size-3.5" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="size-3.5" />
            Gerar com IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <PostEditor
            postType={postType}
            profiles={profiles}
            initialCaption={generatedContent?.caption}
            initialHashtags={generatedContent?.hashtags}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AIGenerator
            postType={postType}
            onGenerated={(content) => setGeneratedContent(content)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
