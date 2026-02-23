import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: accountId, docId } = await params

    const { data: doc } = await supabase
      .from('account_knowledge_docs')
      .select('id, file_url')
      .eq('id', docId)
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

    await supabase
      .from('account_knowledge_docs')
      .delete()
      .eq('id', docId)
      .eq('user_id', user.id)

    if (doc.file_url) {
      await supabase.storage.from('knowledge-docs').remove([doc.file_url])
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
