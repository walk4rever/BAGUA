/**
 * Load xz_du_passages into Supabase via REST API (batch inserts).
 *
 * Requires env vars:
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Usage:
 *   npx tsx scripts/seed-jingshi.ts             # 全部入库
 *   npx tsx scripts/seed-jingshi.ts --volume=2  # 只入卷二
 *   npx tsx scripts/seed-jingshi.ts --volume=1,2
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseJingshiPassages, type PassageSeedRecord } from './jingshi-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  process.stderr.write('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set\n')
  process.exit(1)
}

async function insertBatch(batch: PassageSeedRecord[]): Promise<void> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/xz_du_passages?on_conflict=source_book,source_origin,title,content`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    }
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Insert failed: ${response.status} ${text}`)
  }
}

const input = resolve(__dirname, '../data/经史百家杂钞.txt')
const batchSize = 50

const volumeArg = process.argv.find((a) => a.startsWith('--volume='))
const volumeFilter = volumeArg
  ? new Set(volumeArg.replace('--volume=', '').split(',').map(Number))
  : undefined

const passages = parseJingshiPassages(input, volumeFilter)
const scope = volumeFilter ? `卷 ${[...volumeFilter].join(', ')}` : '全部'
process.stdout.write(`范围：${scope}，共 ${passages.length} 条。Inserting in batches of ${batchSize}...\n`)

let inserted = 0
for (let i = 0; i < passages.length; i += batchSize) {
  const batch = passages.slice(i, i + batchSize)
  await insertBatch(batch)
  inserted += batch.length
  process.stdout.write(`  ${inserted}/${passages.length}\n`)
}

process.stdout.write(`Done. Processed ${inserted} passages into xz_du_passages.\n`)
