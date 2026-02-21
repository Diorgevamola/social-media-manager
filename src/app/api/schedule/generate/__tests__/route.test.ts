/**
 * QA Test Suite — Schedule Generation Feature
 * Agent: Quinn (Guardian) ✅
 *
 * Covers:
 *   1. findObjectEnd — JSON depth parser (unit)
 *   2. SSE stream parsing logic (unit)
 *   3. JSON structure validation — ScheduleDay / PostVisual / ReelScript (unit)
 *   4. Full fictitious generation flow (integration, mocked Gemini)
 *   5. Edge cases — malformed JSON, empty days, partial chunks
 */

// ─── Inline the parser (pure function extracted for isolation) ───────────────

function findObjectEnd(str: string, start: number): number {
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

// ─── SSE line parser (mirrors frontend logic) ─────────────────────────────────

type SSEEvent =
  | { type: 'start'; totalDays: number }
  | { type: 'day'; day: unknown; index: number }
  | { type: 'complete'; account: unknown; period: number; generated_at: string }
  | { type: 'error'; message: string }

function parseSSELines(raw: string): SSEEvent[] {
  const events: SSEEvent[] = []
  const lines = raw.split('\n')
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    try {
      events.push(JSON.parse(line.slice(6)) as SSEEvent)
    } catch { /* skip malformed */ }
  }
  return events
}

// ─── Fictitious schedule builder ──────────────────────────────────────────────

function buildFictitiousDay(date: string, label: string) {
  return {
    date,
    day_label: label,
    posts: [
      {
        type: 'post',
        time: '09:00',
        theme: 'Tema fictício post estático',
        caption: 'Legenda de teste com #hashtag e emojis 🎯',
        content_pillar: 'Educativo',
        seasonal_hook: null,
        visual: {
          headline: 'Headline Fictícia',
          subline: 'Subline de apoio para o designer',
          color_palette: ['#1A1A2E', '#16213E', '#0F3460', '#E94560'],
          fonts: { headline: 'Playfair Display', body: 'Inter' },
          image_description: 'Pessoa sorrindo em frente a um laptop, luz natural lateral',
          background: 'Gradiente de #1A1A2E para #0F3460',
        },
      },
      {
        type: 'reel',
        time: '18:00',
        theme: 'Tema fictício reel trending',
        caption: 'Legenda do reel com CTA 🎬 #reels',
        content_pillar: 'Entretenimento',
        seasonal_hook: 'Carnaval 2026',
        script: {
          duration: '45s',
          hook: 'Você sabia que 90% das pessoas erra isso?',
          scenes: [
            { time: '0-3s', visual: 'Close no rosto surpreso', narration: 'Você sabia que...', text_overlay: '⚠️ ERRO COMUM' },
            { time: '3-15s', visual: 'Tela dividida antes/depois', narration: 'Antes eu fazia assim...', text_overlay: null },
            { time: '15-40s', visual: 'Demo passo a passo', narration: 'Agora faço diferente', text_overlay: '✅ MÉTODO CERTO' },
            { time: '40-45s', visual: 'Logo + CTA', narration: 'Segue para mais dicas!', text_overlay: '👉 SIGA @conta' },
          ],
          cta: 'Salva esse vídeo e manda pra quem precisa!',
        },
      },
    ],
  }
}

// ─── Fictitious Gemini response ───────────────────────────────────────────────

const FICTITIOUS_ACCOUNT = {
  username: 'test_account',
  niche: 'Marketing Digital',
  brand_voice: 'profissional',
  main_goal: 'aumentar_seguidores',
}

function buildFictitiousGeminiResponse(dayCount: number): string {
  const days = Array.from({ length: dayCount }, (_, i) => {
    const date = `2026-02-${String(21 + i).padStart(2, '0')}`
    const labels = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira']
    return buildFictitiousDay(date, `${labels[i % 5]}, ${21 + i} de fevereiro`)
  })
  return JSON.stringify({ schedule: days }, null, 2)
}

// ─── Helper: simulate streaming in chunks ─────────────────────────────────────

async function* chunkString(str: string, chunkSize: number) {
  for (let i = 0; i < str.length; i += chunkSize) {
    yield str.slice(i, i + chunkSize)
  }
}

async function simulateStreamParsing(geminiOutput: string, chunkSize = 50) {
  const extractedDays: unknown[] = []
  let buffer = ''
  let scanFrom = 0
  let foundScheduleArray = false

  for await (const chunk of chunkString(geminiOutput, chunkSize)) {
    buffer += chunk

    if (!foundScheduleArray) {
      const schedIdx = buffer.indexOf('"schedule"')
      if (schedIdx !== -1) {
        const arrIdx = buffer.indexOf('[', schedIdx)
        if (arrIdx !== -1) {
          foundScheduleArray = true
          scanFrom = arrIdx + 1
        }
      }
    }

    if (foundScheduleArray) {
      let keepSearching = true
      while (keepSearching) {
        let i = scanFrom
        while (i < buffer.length && ',\n\r\t '.includes(buffer[i])) i++
        if (i >= buffer.length || buffer[i] !== '{') { keepSearching = false; break }
        const end = findObjectEnd(buffer, i)
        if (end === -1) { keepSearching = false; break }
        try {
          extractedDays.push(JSON.parse(buffer.slice(i, end + 1)))
        } catch { /* skip */ }
        scanFrom = end + 1
      }
    }
  }

  return extractedDays
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═════════════════════════════════════════════════════════════════════════════

describe('findObjectEnd — JSON depth parser', () => {
  test('encontra o fechamento de um objeto simples', () => {
    const s = '{"a": 1}'
    expect(findObjectEnd(s, 0)).toBe(7)
  })

  test('encontra fechamento de objeto aninhado', () => {
    const s = '{"a": {"b": {"c": 3}}}'
    expect(findObjectEnd(s, 0)).toBe(21)
  })

  test('retorna -1 quando objeto está incompleto', () => {
    const s = '{"a": 1, "b": {'
    expect(findObjectEnd(s, 0)).toBe(-1)
  })

  test('ignora chaves dentro de strings', () => {
    const s = '{"key": "value with } brace inside"}'
    expect(findObjectEnd(s, 0)).toBe(35)
  })

  test('ignora chaves escapadas em strings', () => {
    const s = '{"key": "value with \\"escaped\\" and } inside"}'
    expect(findObjectEnd(s, 0)).toBe(45)
  })

  test('funciona com array como raiz', () => {
    const s = '[1, 2, {"a": 3}]'
    expect(findObjectEnd(s, 0)).toBe(15)
  })

  test('funciona corretamente a partir de posição não-zero', () => {
    const s = '  ,  {"date": "2026-02-21", "posts": []}'
    const start = s.indexOf('{')
    expect(findObjectEnd(s, start)).toBe(s.length - 1)
  })

  test('lida com objeto completo de um dia fictício', () => {
    const day = JSON.stringify(buildFictitiousDay('2026-02-21', 'segunda-feira'))
    const result = findObjectEnd(day, 0)
    expect(result).toBe(day.length - 1)
    expect(() => JSON.parse(day.slice(0, result + 1))).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('SSE stream parsing — simulação de chunks', () => {
  test('extrai 1 dia de um stream em 1 chunk', async () => {
    const geminiOutput = buildFictitiousGeminiResponse(1)
    const days = await simulateStreamParsing(geminiOutput, geminiOutput.length)
    expect(days).toHaveLength(1)
  })

  test('extrai 3 dias de um stream em chunks pequenos (50 chars)', async () => {
    const geminiOutput = buildFictitiousGeminiResponse(3)
    const days = await simulateStreamParsing(geminiOutput, 50)
    expect(days).toHaveLength(3)
  })

  test('extrai 5 dias com chunks de 1 char (pior caso)', async () => {
    const geminiOutput = buildFictitiousGeminiResponse(5)
    const days = await simulateStreamParsing(geminiOutput, 1)
    expect(days).toHaveLength(5)
  })

  test('extrai 5 dias com chunks de 200 chars (caso típico)', async () => {
    const geminiOutput = buildFictitiousGeminiResponse(5)
    const days = await simulateStreamParsing(geminiOutput, 200)
    expect(days).toHaveLength(5)
  })

  test('mantém ordem dos dias após extração incremental', async () => {
    const geminiOutput = buildFictitiousGeminiResponse(3)
    const days = await simulateStreamParsing(geminiOutput, 80) as Array<{ date: string }>
    expect(days[0].date).toBe('2026-02-21')
    expect(days[1].date).toBe('2026-02-22')
    expect(days[2].date).toBe('2026-02-23')
  })

  test('não quebra com JSON com espaços extras entre dias', async () => {
    const raw = `{"schedule":[\n\n  ${JSON.stringify(buildFictitiousDay('2026-02-21', 'seg'))}\n\n, \n  ${JSON.stringify(buildFictitiousDay('2026-02-22', 'ter'))}\n]}`
    const days = await simulateStreamParsing(raw, 60)
    expect(days).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('Validação de estrutura — ScheduleDay / PostVisual / ReelScript', () => {
  function validateScheduleDay(day: unknown): void {
    expect(day).toHaveProperty('date')
    expect(day).toHaveProperty('day_label')
    expect(day).toHaveProperty('posts')
    expect(Array.isArray((day as { posts: unknown[] }).posts)).toBe(true)
  }

  function validatePostVisual(visual: unknown): void {
    const v = visual as Record<string, unknown>
    expect(typeof v.headline).toBe('string')
    expect(Array.isArray(v.color_palette)).toBe(true)
    expect((v.color_palette as string[]).length).toBeGreaterThanOrEqual(3)
    expect(v.fonts).toHaveProperty('headline')
    expect(v.fonts).toHaveProperty('body')
    expect(typeof v.image_description).toBe('string')
    expect(typeof v.background).toBe('string')
    // Validate hex codes in palette
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    for (const hex of v.color_palette as string[]) {
      expect(hex).toMatch(hexRegex)
    }
  }

  function validateReelScript(script: unknown): void {
    const s = script as Record<string, unknown>
    expect(typeof s.duration).toBe('string')
    expect(s.duration).toMatch(/^\d+s$/)
    expect(typeof s.hook).toBe('string')
    expect((s.hook as string).length).toBeGreaterThan(0)
    expect(Array.isArray(s.scenes)).toBe(true)
    expect((s.scenes as unknown[]).length).toBeGreaterThan(0)
    expect(typeof s.cta).toBe('string')

    for (const scene of s.scenes as Array<Record<string, unknown>>) {
      expect(typeof scene.time).toBe('string')
      expect(typeof scene.visual).toBe('string')
      expect(typeof scene.narration).toBe('string')
      // text_overlay pode ser string ou null
      expect(scene.text_overlay === null || typeof scene.text_overlay === 'string').toBe(true)
    }
  }

  test('estrutura base de ScheduleDay está correta', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    validateScheduleDay(day)
    expect(day.posts).toHaveLength(2)
  })

  test('post estático tem visual completo e válido', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    const post = day.posts[0]
    expect(post.type).toBe('post')
    expect(post.visual).toBeDefined()
    expect(post.script).toBeUndefined()
    validatePostVisual(post.visual)
  })

  test('reel tem script completo e válido', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    const post = day.posts[1]
    expect(post.type).toBe('reel')
    expect(post.script).toBeDefined()
    expect(post.visual).toBeUndefined()
    validateReelScript(post.script)
  })

  test('campo time está no formato HH:MM', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    const timeRegex = /^\d{2}:\d{2}$/
    for (const post of day.posts) {
      expect(post.time).toMatch(timeRegex)
    }
  })

  test('caption não é vazia', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    for (const post of day.posts) {
      expect(post.caption).not.toBeNull()
      expect((post.caption ?? '').length).toBeGreaterThan(0)
    }
  })

  test('seasonal_hook é string ou null', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    for (const post of day.posts) {
      expect(post.seasonal_hook === null || typeof post.seasonal_hook === 'string').toBe(true)
    }
  })

  test('4 paletas de cor com códigos hex válidos', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    const post = day.posts[0]
    validatePostVisual(post.visual)
    expect(post.visual!.color_palette).toHaveLength(4)
  })

  test('reel tem pelo menos 2 cenas', () => {
    const day = buildFictitiousDay('2026-02-21', 'segunda-feira')
    const reel = day.posts[1]
    expect(reel.script!.scenes.length).toBeGreaterThanOrEqual(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('SSE output format — eventos gerados pelo backend', () => {
  function buildSSEOutput(days: unknown[]): string {
    const events: string[] = []
    events.push(`data: ${JSON.stringify({ type: 'start', totalDays: days.length })}\n\n`)
    days.forEach((day, index) => {
      events.push(`data: ${JSON.stringify({ type: 'day', day, index })}\n\n`)
    })
    events.push(`data: ${JSON.stringify({
      type: 'complete',
      account: FICTITIOUS_ACCOUNT,
      period: 7,
      generated_at: '2026-02-21T10:00:00.000Z',
    })}\n\n`)
    return events.join('')
  }

  test('SSE tem evento start como primeiro evento', () => {
    const days = [buildFictitiousDay('2026-02-21', 'segunda')]
    const raw = buildSSEOutput(days)
    const events = parseSSELines(raw)
    expect(events[0].type).toBe('start')
    expect((events[0] as { type: 'start'; totalDays: number }).totalDays).toBe(1)
  })

  test('SSE tem N eventos day para N dias', () => {
    const n = 3
    const days = Array.from({ length: n }, (_, i) =>
      buildFictitiousDay(`2026-02-${21 + i}`, `dia ${i + 1}`)
    )
    const raw = buildSSEOutput(days)
    const events = parseSSELines(raw)
    const dayEvents = events.filter(e => e.type === 'day')
    expect(dayEvents).toHaveLength(n)
  })

  test('SSE tem evento complete com campos obrigatórios', () => {
    const days = [buildFictitiousDay('2026-02-21', 'segunda')]
    const raw = buildSSEOutput(days)
    const events = parseSSELines(raw)
    const complete = events.find(e => e.type === 'complete') as {
      type: 'complete'; account: typeof FICTITIOUS_ACCOUNT; period: number; generated_at: string
    }
    expect(complete).toBeDefined()
    expect(complete.account.username).toBe('test_account')
    expect(complete.period).toBe(7)
    expect(complete.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('SSE day events têm índice sequencial correto', () => {
    const n = 4
    const days = Array.from({ length: n }, (_, i) =>
      buildFictitiousDay(`2026-02-${21 + i}`, `dia ${i + 1}`)
    )
    const raw = buildSSEOutput(days)
    const events = parseSSELines(raw)
    const dayEvents = events.filter(e => e.type === 'day') as Array<{ type: 'day'; index: number }>
    dayEvents.forEach((e, i) => {
      expect(e.index).toBe(i)
    })
  })

  test('SSE ordena start → day... → complete', () => {
    const days = [buildFictitiousDay('2026-02-21', 'segunda'), buildFictitiousDay('2026-02-22', 'terça')]
    const raw = buildSSEOutput(days)
    const events = parseSSELines(raw)
    expect(events[0].type).toBe('start')
    expect(events[events.length - 1].type).toBe('complete')
    const middle = events.slice(1, -1)
    expect(middle.every(e => e.type === 'day')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('Edge cases — cenários adversos', () => {
  test('findObjectEnd retorna -1 para string vazia', () => {
    expect(findObjectEnd('', 0)).toBe(-1)
  })

  test('findObjectEnd retorna -1 para string sem objeto', () => {
    expect(findObjectEnd('abc 123', 0)).toBe(-1)
  })

  test('parser SSE ignora linhas sem prefixo "data: "', () => {
    const raw = 'event: message\nid: 1\ndata: {"type":"start","totalDays":2}\n\n'
    const events = parseSSELines(raw)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('start')
  })

  test('parser SSE ignora data: com JSON inválido sem lançar erro', () => {
    const raw = 'data: {invalid json}\ndata: {"type":"start","totalDays":1}\n\n'
    expect(() => parseSSELines(raw)).not.toThrow()
    const events = parseSSELines(raw)
    expect(events).toHaveLength(1)
  })

  test('simulateStreamParsing retorna 0 dias para JSON sem schedule array', async () => {
    const malformed = '{"result": "ok", "data": []}'
    const days = await simulateStreamParsing(malformed, 10)
    expect(days).toHaveLength(0)
  })

  test('simulateStreamParsing é resistente a JSON parcialmente válido', async () => {
    // Um dia válido + lixo no final
    const oneDay = JSON.stringify(buildFictitiousDay('2026-02-21', 'segunda'))
    const corrupt = `{"schedule":[${oneDay}, {"date": "2026-02-22", "incomplete":`
    const days = await simulateStreamParsing(corrupt, 40)
    // Deve extrair apenas o primeiro dia completo
    expect(days).toHaveLength(1)
  })

  test('hex palette validation — rejeita código hex inválido', () => {
    const invalidHexes = ['#GGGGGG', '#12345', 'red', '1A1A2E']
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    for (const hex of invalidHexes) {
      expect(hex).not.toMatch(hexRegex)
    }
  })

  test('reel duration format — rejeita formatos inválidos', () => {
    const durationRegex = /^\d+s$/
    expect('45s').toMatch(durationRegex)
    expect('30s').toMatch(durationRegex)
    expect('45 seconds').not.toMatch(durationRegex)
    expect('0.5min').not.toMatch(durationRegex)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('Geração fictícia completa — 5 dias com post + reel por dia', () => {
  let extractedDays: unknown[]

  beforeAll(async () => {
    const geminiOutput = buildFictitiousGeminiResponse(5)
    extractedDays = await simulateStreamParsing(geminiOutput, 100)
  })

  test('extrai exatamente 5 dias', () => {
    expect(extractedDays).toHaveLength(5)
  })

  test('todos os dias têm 2 posts (post + reel)', () => {
    for (const day of extractedDays as Array<{ posts: unknown[] }>) {
      expect(day.posts).toHaveLength(2)
    }
  })

  test('primeiro post de cada dia é do tipo post', () => {
    for (const day of extractedDays as Array<{ posts: Array<{ type: string }> }>) {
      expect(day.posts[0].type).toBe('post')
    }
  })

  test('segundo post de cada dia é do tipo reel', () => {
    for (const day of extractedDays as Array<{ posts: Array<{ type: string }> }>) {
      expect(day.posts[1].type).toBe('reel')
    }
  })

  test('todos os posts estáticos têm visual definido', () => {
    for (const day of extractedDays as Array<{ posts: Array<{ type: string; visual?: unknown }> }>) {
      expect(day.posts[0].visual).toBeDefined()
    }
  })

  test('todos os reels têm script definido', () => {
    for (const day of extractedDays as Array<{ posts: Array<{ type: string; script?: unknown }> }>) {
      expect(day.posts[1].script).toBeDefined()
    }
  })

  test('datas estão em sequência correta', () => {
    const days = extractedDays as Array<{ date: string }>
    for (let i = 1; i < days.length; i++) {
      expect(new Date(days[i].date) > new Date(days[i - 1].date)).toBe(true)
    }
  })
})
