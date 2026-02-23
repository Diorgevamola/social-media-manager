import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFParse } from 'pdf-parse'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: accountId } = await params

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

    const { data: docs, error } = await supabase
      .from('account_knowledge_docs')
      .select('id, file_name, file_size, created_at')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ docs: docs ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: accountId } = await params

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

    const { count } = await supabase
      .from('account_knowledge_docs')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('user_id', user.id)

    if ((count ?? 0) >= 11) {
      return NextResponse.json({ error: 'Limite de 11 documentos atingido' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    try {
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      extractedText = result.text?.trim() ?? ''
    } catch {
      extractedText = ''
    }

    const docId = crypto.randomUUID()
    const storagePath = `${user.id}/${accountId}/${docId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('knowledge-docs')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 })
    }

    const { data: doc, error: dbError } = await supabase
      .from('account_knowledge_docs')
      .insert({
        id: docId,
        account_id: accountId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_url: storagePath,
        extracted_text: extractedText || null,
      })
      .select('id, file_name, file_size, created_at')
      .single()

    if (dbError) {
      await supabase.storage.from('knowledge-docs').remove([storagePath])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ doc }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar PDF'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
