'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import {
  AlertTriangle, TrendingUp, DollarSign, Zap, BarChart3, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────
interface FxRate {
  rate: number
  source: string
  updatedAt: string
}

interface ModelStat {
  model: string
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

interface OpStat {
  operation_type: string
  calls: number
  costUsd: number
}

interface DayPoint {
  date: string
  costUsd: number
}

interface FinancialData {
  fx: FxRate
  totalAccurateCost: number
  totalEstimated: number
  totalOperational: number
  totalCalls: number
  avgCostPerCall: number
  avgCostPerDay: number
  avgCostPerUser: number
  totalUsers: number
  firstLogDate: string | null
  modelStats: ModelStat[]
  opStats: OpStat[]
  dailyChart: DayPoint[]
  textCount: number
  imageCount: number
  videoCount: number
  textPricePerCall: number
  imagePricePerUnit: number
  videoPricePerUnit: number
  estimatedText: number
  estimatedImage: number
  estimatedVideo: number
}

// ── Pricing reference table ────────────────────────────────────────────────
const PROVIDER_PRICING = [
  {
    provider: 'Google AI',
    models: [
      { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', type: 'text' as const, inputPer1M: 0.06, outputPer1M: 0.24, perUnit: null, unitLabel: null },
      { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image', type: 'image' as const, inputPer1M: null, outputPer1M: null, perUnit: 0.04, unitLabel: 'por imagem' },
      { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 (vídeo)', type: 'video' as const, inputPer1M: null, outputPer1M: null, perUnit: 0.35, unitLabel: 'por vídeo' },
    ],
  },
]

// ── Chart palette ──────────────────────────────────────────────────────────
const PALETTE = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

// ── Linear regression forecast (next N days) ──────────────────────────────
function linearForecast(points: DayPoint[], futureDays = 7): DayPoint[] {
  const n = points.length
  if (n < 2) return []
  const xs = points.map((_, i) => i)
  const ys = points.map((p) => p.costUsd)
  const sumX  = xs.reduce((a, b) => a + b, 0)
  const sumY  = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const forecast: DayPoint[] = []
  for (let i = 1; i <= futureDays; i++) {
    const x = n - 1 + i
    const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
    forecast.push({
      date: d.toISOString().slice(0, 10),
      costUsd: Math.max(0, slope * x + intercept),
    })
  }
  return forecast
}

// ── Helpers ────────────────────────────────────────────────────────────────
/** Converte USD → BRL e formata como moeda brasileira */
function fmtBrl(usd: number, rate: number, decimals = 2) {
  const brl = usd * rate
  return brl.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Formata USD puro (para tabela de preços de referência) */
function fmtUsdRef(n: number) {
  return `$${n.toFixed(4)}`
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function opLabel(op: string) {
  const map: Record<string, string> = {
    image: 'Imagem', video: 'Vídeo', schedule: 'Cronograma',
    caption: 'Legenda', hashtags: 'Hashtags', ideas: 'Ideias',
    text: 'Texto', research: 'Pesquisa',
  }
  return map[op] ?? op
}

function typeColor(type: 'text' | 'image' | 'video') {
  if (type === 'image') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  if (type === 'video') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
}

// Custom tooltip para os gráficos — recebe rate via closure
function makeChartTooltip(rate: number) {
  return function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        {label && <p className="text-muted-foreground text-xs mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} className="font-medium">
            {p.name}: {fmtBrl(p.value, rate)}
            <span className="text-muted-foreground text-xs ml-1">({fmtUsdRef(p.value)})</span>
          </p>
        ))}
      </div>
    )
  }
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AdminFinancialPage() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/financial')
      if (!res.ok) throw new Error('Falha ao carregar dados')
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Derived chart data
  const rate = data?.fx?.rate ?? 5.5
  const forecast = data ? linearForecast(data.dailyChart) : []
  const ChartTooltip = makeChartTooltip(rate)

  const combinedChart = data
    ? [
        ...data.dailyChart.map((p) => ({ date: shortDate(p.date), real: p.costUsd, prev: undefined })),
        ...forecast.map((p) => ({ date: shortDate(p.date), real: undefined, prev: p.costUsd })),
      ]
    : []

  const pieData = data
    ? data.modelStats.map((m) => ({ name: m.model.replace('gemini-', 'G ').replace('-preview', ''), value: m.costUsd }))
    : []

  const barData = data
    ? data.opStats
        .sort((a, b) => b.costUsd - a.costUsd)
        .slice(0, 8)
        .map((op) => ({ name: opLabel(op.operation_type), custo: op.costUsd, chamadas: op.calls }))
    : []

  const projectedMonthly = data ? data.avgCostPerDay * 30 : 0
  const projectedNextWeek = forecast.reduce((s, p) => s + p.costUsd, 0)

  return (
    <AdminShell>
      <div className="p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Custos de IA · por token · médias · gráficos · previsibilidade
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Badge cotação */}
            {data?.fx && (
              <div className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2 bg-muted/30">
                <span className="text-muted-foreground">USD/BRL</span>
                <span className="font-semibold tabular-nums">
                  {data.fx.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
                <span className="text-muted-foreground">
                  · {data.fx.source === 'fallback' ? 'estimado' : 'tempo real'}
                  {data.fx.updatedAt && data.fx.source !== 'fallback'
                    ? ` · ${new Date(data.fx.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </span>
              </div>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4 text-sm">{error}</div>
        )}
        {loading && !data && (
          <div className="text-muted-foreground text-sm animate-pulse">Carregando dados financeiros...</div>
        )}

        {data && (
          <>
            {/* ── 1. Custo Total Operacional ────────────────────────────── */}
            <section className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="size-5 text-emerald-600" />
                <h2 className="font-semibold text-lg">Custo Total Operacional</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {fmtBrl(data.totalOperational, rate)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtUsdRef(data.totalOperational)} USD</p>
                  <p className="text-sm text-muted-foreground mt-1">Total combinado (preciso + estimativa)</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{fmtBrl(data.totalAccurateCost, rate)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtUsdRef(data.totalAccurateCost)} USD</p>
                  <p className="text-sm text-muted-foreground mt-1">Custo preciso (logs de tokens)</p>
                </div>
                <div>
                  <p className="text-xl font-semibold">{fmtBrl(data.totalEstimated, rate)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmtUsdRef(data.totalEstimated)} USD</p>
                  <p className="text-sm text-muted-foreground mt-1">Estimativa retroativa (histórico)</p>
                </div>
              </div>
            </section>

            {/* ── 2. Custos Médios + Previsão ───────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">Custos Médios e Previsão</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card border rounded-xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">Por chamada</p>
                  <p className="text-xl font-bold">{fmtBrl(data.avgCostPerCall, rate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Média por req. de IA</p>
                </div>
                <div className="bg-card border rounded-xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">Por dia</p>
                  <p className="text-xl font-bold">{fmtBrl(data.avgCostPerDay, rate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Média diária</p>
                </div>
                <div className="bg-card border rounded-xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">Por usuário</p>
                  <p className="text-xl font-bold">{fmtBrl(data.avgCostPerUser, rate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.totalUsers} usuários</p>
                </div>
                <div className="bg-card border rounded-xl p-5 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Previsão próx. 7 dias</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{fmtBrl(projectedNextWeek, rate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Mensal: {fmtBrl(projectedMonthly, rate)}</p>
                </div>
              </div>
            </section>

            {/* ── 3. Gráfico: Custo Diário + Previsão ──────────────────── */}
            <section className="bg-card border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Custo Diário — últimos 30 dias</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Área sólida = real · área tracejada = previsão (regressão linear)
                  </p>
                </div>
              </div>
              <div className="p-4">
                {combinedChart.length === 0 || combinedChart.every(p => !p.real && !p.prev) ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados de uso registrados ainda
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={combinedChart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        interval={4}
                        stroke="transparent"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => fmtBrl(v, rate)}
                        width={72}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine
                        x={shortDate(new Date().toISOString().slice(0, 10))}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{ value: 'hoje', position: 'top', fontSize: 11, fill: '#94a3b8' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="real"
                        name="Custo real"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#gradReal)"
                        connectNulls={false}
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="prev"
                        name="Previsão"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        fill="url(#gradPrev)"
                        connectNulls={false}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* ── 4. Gráficos: Distribuição por Modelo + Por Operação ───── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Donut — por modelo */}
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h2 className="font-semibold">Distribuição de custo por modelo</h2>
                </div>
                <div className="p-4">
                  {pieData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados rastreados
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number | undefined) => v !== undefined ? [`${fmtBrl(v, rate)} (${fmtUsdRef(v)})`, 'Custo'] : ['', 'Custo']}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Bar — por operação */}
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h2 className="font-semibold">Custo por tipo de operação</h2>
                </div>
                <div className="p-4">
                  {barData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Sem dados rastreados
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={barData} margin={{ top: 0, right: 8, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          angle={-30}
                          textAnchor="end"
                          stroke="transparent"
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => fmtBrl(v, rate)}
                          width={72}
                        />
                        <Tooltip formatter={(v: number | undefined) => v !== undefined ? [`${fmtBrl(v, rate)} (${fmtUsdRef(v)})`, 'Custo'] : ['', 'Custo']} />
                        <Bar dataKey="custo" name="Custo" radius={[4, 4, 0, 0]}>
                          {barData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* ── 5. Preços por Token — Provedores ─────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">Preços por Token — Provedores</h2>
              </div>
              {PROVIDER_PRICING.map(({ provider, models }) => (
                <div key={provider} className="bg-card border rounded-xl overflow-hidden mb-4">
                  <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-3">
                    <span className="font-semibold text-sm">{provider}</span>
                    <span className="text-xs text-muted-foreground">google.ai / Gemini API</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Modelo</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Entrada / 1M tokens</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saída / 1M tokens</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Por geração</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((m) => (
                          <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <span className="font-medium">{m.label}</span>
                              <span className="ml-2 font-mono text-xs text-muted-foreground">{m.id}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(m.type)}`}>
                                {m.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {m.inputPer1M !== null ? `$${m.inputPer1M.toFixed(3)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {m.outputPer1M !== null ? `$${m.outputPer1M.toFixed(3)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium">
                              {m.perUnit !== null ? `$${m.perUnit.toFixed(4)} ${m.unitLabel}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="px-5 py-3 text-xs text-muted-foreground border-t">
                    Preços aproximados — atualize em <code className="font-mono">src/lib/ai-pricing.ts</code>. Consulte{' '}
                    <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      ai.google.dev/pricing
                    </a>{' '}
                    para valores exatos.
                  </p>
                </div>
              ))}
            </section>

            {/* ── 6. Tabela por Modelo (dados reais) ───────────────────── */}
            {data.modelStats.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <h2 className="font-semibold">Uso por Modelo (dados rastreados)</h2>
                </div>
                <div className="bg-card border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Modelo</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Chamadas</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tokens entrada</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tokens saída</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Custo total</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Custo médio/chamada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.modelStats.map((m) => (
                          <tr key={m.model} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-3 font-mono text-xs">{m.model}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{m.calls.toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{fmtTokens(m.inputTokens)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{fmtTokens(m.outputTokens)}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium">
                              {fmtBrl(m.costUsd, rate)}
                              <span className="block text-xs text-muted-foreground">{fmtUsdRef(m.costUsd)}</span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {m.calls > 0 ? fmtBrl(m.costUsd / m.calls, rate) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* ── 7. Estimativas Retroativas ────────────────────────────── */}
            <section>
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h2 className="font-semibold">Estimativas Históricas (antes dos logs de tokens)</h2>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Estimativas baseadas em volume × preço médio por operação.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-muted-foreground text-xs mb-1">Gerações de texto</p>
                      <p className="font-semibold">{data.textCount.toLocaleString('pt-BR')} gerações</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        × ${data.textPricePerCall.toFixed(4)}/chamada = <strong>{fmtBrl(data.estimatedText, rate)}</strong>
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-muted-foreground text-xs mb-1">Imagens geradas</p>
                      <p className="font-semibold">{data.imageCount.toLocaleString('pt-BR')} imagens</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        × ${data.imagePricePerUnit.toFixed(4)}/imagem = <strong>{fmtBrl(data.estimatedImage, rate)}</strong>
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-muted-foreground text-xs mb-1">Vídeos gerados</p>
                      <p className="font-semibold">{data.videoCount.toLocaleString('pt-BR')} vídeos</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        × ${data.videoPricePerUnit.toFixed(4)}/vídeo = <strong>{fmtBrl(data.estimatedVideo, rate)}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm font-semibold">Total estimado: {fmtBrl(data.totalEstimated, rate)}</p>
                  </div>
                </div>
              </div>
            </section>

          </>
        )}
      </div>
    </AdminShell>
  )
}
