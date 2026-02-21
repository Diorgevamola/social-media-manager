import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { AI_PRICING } from '@/lib/ai-pricing'

/** Busca cotação USD→BRL em tempo real. Fallback para 5.5 se a API falhar. */
async function fetchUsdToBrl(): Promise<{ rate: number; source: string; updatedAt: string }> {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      next: { revalidate: 3600 }, // cache por 1h no Next.js
    })
    if (!res.ok) throw new Error('status ' + res.status)
    const json = await res.json() as { USDBRL: { bid: string; create_date: string } }
    return {
      rate:      parseFloat(json.USDBRL.bid),
      source:    'AwesomeAPI',
      updatedAt: json.USDBRL.create_date,
    }
  } catch {
    return { rate: 5.5, source: 'fallback', updatedAt: new Date().toISOString() }
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (auth instanceof Response) return auth

  const db = createServiceClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch cotação em paralelo com os dados do banco
  const fxPromise = fetchUsdToBrl()

  const [
    { data: usageLogs },
    { data: dailyRows },
    { count: textCount },
    { count: imageCount },
    { count: videoCount },
    { count: totalUsers },
    { data: firstLogRow },
  ] = await Promise.all([
    db.from('ai_usage_logs').select('model, operation_type, input_tokens, output_tokens, cost_usd, created_at'),
    db.from('ai_usage_logs').select('cost_usd, created_at').gte('created_at', thirtyDaysAgo),
    db.from('ai_generations').select('*', { count: 'exact', head: true }),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }).not('generated_image_url', 'is', null),
    db.from('schedule_posts').select('*', { count: 'exact', head: true }).not('generated_video_url', 'is', null),
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('ai_usage_logs').select('created_at').order('created_at', { ascending: true }).limit(1),
  ])

  // Aggregate by model & operation
  const modelMap: Record<string, { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }> = {}
  const opMap: Record<string, { operation_type: string; calls: number; costUsd: number }> = {}
  let totalAccurateCost = 0
  const rows = usageLogs ?? []

  for (const row of rows) {
    const cost = Number(row.cost_usd ?? 0)
    totalAccurateCost += cost

    if (!modelMap[row.model]) {
      modelMap[row.model] = { model: row.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
    }
    modelMap[row.model].calls        += 1
    modelMap[row.model].inputTokens  += row.input_tokens ?? 0
    modelMap[row.model].outputTokens += row.output_tokens ?? 0
    modelMap[row.model].costUsd      += cost

    if (!opMap[row.operation_type]) {
      opMap[row.operation_type] = { operation_type: row.operation_type, calls: 0, costUsd: 0 }
    }
    opMap[row.operation_type].calls   += 1
    opMap[row.operation_type].costUsd += cost
  }

  // Daily aggregation (last 30 days) — fill every day in the window
  const dayMap: Record<string, number> = {}
  for (const row of dailyRows ?? []) {
    const day = (row.created_at as string).slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + Number(row.cost_usd ?? 0)
  }

  // Build a contiguous 30-day array (0 for days with no spend)
  const dailyChart: { date: string; costUsd: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dailyChart.push({ date: key, costUsd: dayMap[key] ?? 0 })
  }

  // Retroactive estimates
  const textPricePerCall  = 0.003
  const imagePricePerUnit = AI_PRICING['gemini-3-pro-image-preview']?.perImage ?? 0.04
  const videoPricePerUnit = AI_PRICING['veo-3.1-generate-preview']?.perVideo ?? 0.35

  const estimatedText  = (textCount  ?? 0) * textPricePerCall
  const estimatedImage = (imageCount ?? 0) * imagePricePerUnit
  const estimatedVideo = (videoCount ?? 0) * videoPricePerUnit
  const totalEstimated = estimatedText + estimatedImage + estimatedVideo

  // Totals & averages
  const totalOperational = totalAccurateCost + totalEstimated
  const totalCalls = rows.length
  const firstLogDate = firstLogRow?.[0]?.created_at ?? null
  const daysSinceFirstLog = firstLogDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(firstLogDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 1

  const avgCostPerCall = totalCalls > 0 ? totalAccurateCost / totalCalls : 0
  const avgCostPerDay  = totalAccurateCost / daysSinceFirstLog
  const avgCostPerUser = (totalUsers ?? 0) > 0 ? totalOperational / (totalUsers ?? 1) : 0

  const fx = await fxPromise

  return NextResponse.json({
    fx,
    totalAccurateCost,
    totalEstimated,
    totalOperational,
    totalCalls,
    avgCostPerCall,
    avgCostPerDay,
    avgCostPerUser,
    totalUsers:       totalUsers ?? 0,
    firstLogDate,
    modelStats:       Object.values(modelMap),
    opStats:          Object.values(opMap),
    dailyChart,
    textCount:        textCount  ?? 0,
    imageCount:       imageCount ?? 0,
    videoCount:       videoCount ?? 0,
    textPricePerCall,
    imagePricePerUnit,
    videoPricePerUnit,
    estimatedText,
    estimatedImage,
    estimatedVideo,
  })
}
