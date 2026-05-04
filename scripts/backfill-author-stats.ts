/**
 * 为 xz_du_authors 补充 dynasty, approx_year, article_count, total_chars。
 *
 * Usage:
 *   npx tsx scripts/backfill-author-stats.ts           # 全量
 *   npx tsx scripts/backfill-author-stats.ts --dry-run # 只打印，不写入
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { parseJingshiPassages } from './jingshi-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl   = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const aiApiKey      = process.env.AI_API_KEY!
const aiBaseUrl     = process.env.AI_API_BASE_URL!
const aiModel       = process.env.AI_PRIMARY_MODEL!

if (!supabaseUrl || !serviceRoleKey || !aiApiKey || !aiBaseUrl || !aiModel) {
  console.error('Missing required env vars'); process.exit(1)
}

const isDryRun = process.argv.includes('--dry-run')
const DELAY_MS = 400

const VALID_DYNASTIES = ['先秦','秦','汉','魏晋','南北朝','隋唐','宋','元','明','清'] as const
type Dynasty = typeof VALID_DYNASTIES[number]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const supaFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`)
  if (!text.trim()) return null as T
  return JSON.parse(text) as T
}

const DYNASTY_PROMPT = `给定一位中国历史上的作者或典籍名，返回以下两个字段的 JSON（仅输出 JSON，不要任何其他内容）：
- dynasty: 所属朝代，必须从以下列表中选一个值：先秦、秦、汉、魏晋、南北朝、隋唐、宋、元、明、清
- approx_year: 该作者最活跃创作期的代表年份（整数，公元前用负数）

示例输出：{"dynasty":"唐","approx_year":800}`

const callAI = async (authorName: string): Promise<{ dynasty: Dynasty; approx_year: number } | null> => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${aiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: DYNASTY_PROMPT },
            { role: 'user', content: authorName },
          ],
          temperature: 0,
          max_tokens: 2000,
          stream: false,
        }),
        signal: AbortSignal.timeout(20000),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`AI ${res.status}: ${text}`)
      const data = JSON.parse(text) as { choices: Array<{ message: { content: string } }> }
      const raw = (data.choices[0]?.message?.content ?? '').trim()
      // strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(cleaned) as { dynasty: string; approx_year: number }
      if (!VALID_DYNASTIES.includes(parsed.dynasty as Dynasty)) {
        throw new Error(`Invalid dynasty: ${parsed.dynasty}`)
      }
      return { dynasty: parsed.dynasty as Dynasty, approx_year: parsed.approx_year }
    } catch (err) {
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000))
      else console.error(`  ✗ AI failed for [${authorName}]: ${err instanceof Error ? err.message : err}`)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// 1. 取所有作者
const authors = await supaFetch<Array<{
  source_origin: string
  dynasty: string | null
  approx_year: number | null
  article_count: number | null
  total_chars: number | null
}>>('xz_du_authors?select=source_origin,dynasty,approx_year,article_count,total_chars&limit=9999')

// 2 & 3. 从源文件统计 article_count 和 total_chars（覆盖全部26卷，不受入库进度影响）
const sourceFile = resolve(__dirname, '../data/经史百家杂钞.txt')
const allPassages = parseJingshiPassages(sourceFile)

const artCount: Record<string, number> = {}
const charTotal: Record<string, number> = {}
const seenArticles = new Set<string>()

for (const p of allPassages) {
  const base = p.title.replace(/（\d+）$/, '')  // 去掉段落编号，得到文章标题
  const key = `${p.source_origin}\x00${base}`
  if (!seenArticles.has(key)) {
    seenArticles.add(key)
    artCount[p.source_origin] = (artCount[p.source_origin] ?? 0) + 1
  }
  charTotal[p.source_origin] = (charTotal[p.source_origin] ?? 0) + p.content.length
}

// 4. 确定哪些作者需要更新
const needStats   = authors.filter(a => a.article_count === null || a.total_chars === null || a.total_chars === 0)
const needDynasty = authors.filter(a => a.dynasty === null || a.approx_year === null)

console.log(`Total authors: ${authors.length}`)
console.log(`Need stats update:   ${needStats.length}`)
console.log(`Need dynasty/year:   ${needDynasty.length}`)
if (isDryRun) { console.log('Dry run — exiting.'); process.exit(0) }

let ok = 0, fail = 0
const total = new Set([...needStats, ...needDynasty].map(a => a.source_origin)).size

// 5. 合并更新：对每位作者一次性写入所有需要更新的字段
const allAuthors = authors.filter(a =>
  a.article_count === null || a.total_chars === null || a.total_chars === 0 || a.dynasty === null || a.approx_year === null
)

for (const author of allAuthors) {
  const name = author.source_origin
  const patch: Record<string, unknown> = {}

  // stats（纯计算）
  if (author.article_count === null || author.total_chars === null || author.total_chars === 0) {
    patch.article_count = artCount[name] ?? 0
    patch.total_chars   = charTotal[name] ?? 0
  }

  // dynasty + year（AI）
  if (author.dynasty === null || author.approx_year === null) {
    const result = await callAI(name)
    if (result) {
      patch.dynasty     = result.dynasty
      patch.approx_year = result.approx_year
    } else {
      fail++
      console.error(`✗ [${name}]  dynasty AI failed`)
      continue
    }
    await new Promise((r) => setTimeout(r, DELAY_MS))
  }

  try {
    await supaFetch(
      `xz_du_authors?source_origin=eq.${encodeURIComponent(name)}`,
      { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }
    )
    ok++
    const dynastyStr = patch.dynasty ? ` ${patch.dynasty} ${patch.approx_year}` : ''
    console.log(`✓ [${name}]${dynastyStr}  (${ok + fail}/${total})`)
  } catch (err) {
    fail++
    console.error(`✗ [${name}]: ${err instanceof Error ? err.message : err}`)
  }
}

console.log(`\nDone. ✓ ${ok}  ✗ ${fail}`)
