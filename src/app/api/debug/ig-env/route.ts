import { NextResponse } from 'next/server'

// Endpoint de DEBUG TEMPORÁRIO — remover após diagnóstico
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'NOT_SET'
  const igAppId = process.env.INSTAGRAM_APP_ID ?? 'NOT_SET'
  const igPubAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? 'NOT_SET'

  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_APP_URL_length: appUrl.length,
    NEXT_PUBLIC_APP_URL_charCodes: Array.from(appUrl).map((c, i) => ({ i, c, code: c.charCodeAt(0) })).filter(x => x.code < 32 || x.code > 126),
    INSTAGRAM_APP_ID: igAppId,
    NEXT_PUBLIC_INSTAGRAM_APP_ID: igPubAppId,
    redirectUri: `${appUrl}/api/instagram/callback`,
    env: process.env.VERCEL_ENV ?? 'local',
  })
}
