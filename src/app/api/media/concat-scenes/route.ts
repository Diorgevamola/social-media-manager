import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const BUCKET = 'schedule-media'

const schema = z.object({
  postId:    z.string().uuid(),
  sceneUrls: z.array(z.string().url()).min(2),
})

export async function POST(request: Request) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aios-concat-'))

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { postId, sceneUrls } = parsed.data

    // Verify post ownership
    const { data: post } = await supabase
      .from('schedule_posts')
      .select('id, user_id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
    }

    // Download all scene videos to temp dir
    const inputFiles: string[] = []
    for (let i = 0; i < sceneUrls.length; i++) {
      const url = sceneUrls[i]
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Falha ao baixar cena ${i + 1}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      const filePath = path.join(tmpDir, `scene${i}.mp4`)
      await fs.writeFile(filePath, buffer)
      inputFiles.push(filePath)
    }

    // Write concat list file
    const concatList = inputFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n')
    const listPath = path.join(tmpDir, 'concat.txt')
    await fs.writeFile(listPath, concatList)

    // Output file
    const outputPath = path.join(tmpDir, 'final.mp4')

    // Run ffmpeg concat
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`ffmpeg: ${err.message}`)))
        .run()
    })

    // Read output and upload to Supabase Storage
    const outputBuffer = await fs.readFile(outputPath)

    const service = createServiceClient()

    // Ensure bucket exists
    await service.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 52428800 })
    await service.storage.updateBucket(BUCKET, { public: true })

    const storagePath = `${user.id}/${postId}-final.mp4`
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, outputBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadError) throw new Error(`Upload: ${uploadError.message}`)

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(storagePath)
    const publicUrl = urlData.publicUrl

    // Update schedule_posts.generated_video_url with the final concatenated video
    await supabase
      .from('schedule_posts')
      .update({ generated_video_url: publicUrl })
      .eq('id', postId)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao concatenar vídeos'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    // Clean up temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}
