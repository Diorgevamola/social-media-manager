import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'A integração direta com a API do Instagram não está disponível nesta versão. Use a geração de conteúdo via IA.' },
    { status: 410 },
  )
}
