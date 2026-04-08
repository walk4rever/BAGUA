/**
 * Backfill xz_du_passages.volume using the canonical 经史百家杂钞 parser output.
 *
 * Usage:
 *   npx tsx scripts/backfill-jingshi-volume.ts
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseJingshiPassages } from './jingshi-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  process.stderr.write('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set\n')
  process.exit(1)
}

interface DbPassage {
  id: number
  source_book: string
  source_origin: string | null
  title: string | null
  content: string
  volume: number | null
}

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

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase ${res.status}: ${text}`)
  }

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

const identityKey = (row: {
  source_book: string
  source_origin: string | null
  title: string | null
  content: string
}) => [row.source_book, row.source_origin ?? '', row.title ?? '', row.content].join('||')

const input = resolve(__dirname, '../data/经史百家杂钞.txt')
const canonical = parseJingshiPassages(input)
const canonicalVolumeByKey = new Map(canonical.map((row) => [identityKey(row), row.volume]))

const rows = await supaFetch<DbPassage[]>(
  'xz_du_passages?select=id,source_book,source_origin,title,content,volume&source_book=eq.%E7%BB%8F%E5%8F%B2%E7%99%BE%E5%AE%B6%E6%9D%82%E9%92%9E&limit=5000'
)

let updated = 0
let missing = 0

for (const row of rows) {
  const volume = canonicalVolumeByKey.get(identityKey(row))
  if (!volume) {
    missing += 1
    process.stderr.write(`No canonical volume match for id=${row.id} ${row.source_origin ?? ''} · ${row.title ?? ''}\n`)
    continue
  }
  if (row.volume === volume) continue

  await supaFetch(`xz_du_passages?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ volume }),
  })
  updated += 1
}

process.stdout.write(`Backfill complete. Updated ${updated} rows.`)
if (missing > 0) process.stdout.write(` Missing matches: ${missing}.`)
process.stdout.write('\n')
