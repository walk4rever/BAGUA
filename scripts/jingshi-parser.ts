import { readFileSync } from 'fs'

export interface PassageSeedRecord {
  source_book: string
  source_origin: string
  title: string
  content: string
  difficulty: number
  theme: string
  volume: number
  enabled: boolean
}

const THEME_MAP: Array<[RegExp, string]> = [
  [/论著/, '论著'],
  [/词赋/, '词赋'],
  [/序跋/, '序跋'],
  [/诏令/, '诏令'],
  [/奏议/, '奏议'],
  [/书牍/, '书牍'],
  [/哀祭/, '哀祭'],
  [/传志/, '传志'],
  [/叙[记事]/, '叙记'],
  [/典志/, '典志'],
  [/杂[记钞]/, '杂记'],
]

const PRE_QIN = new Set([
  '书', '诗', '易', '礼', '春秋', '左传',
  '孟子', '庄子', '荀子', '韩非子', '老子', '列子', '墨子',
  '屈原', '宋玉',
])

const HAN = new Set([
  '贾谊', '班固', '司马迁', '班彪', '东方朔', '司马相如',
  '扬雄', '张衡', '王粲', '曹操', '陆机', '刘伶', '潘岳',
  '左思', '江统', '李康',
])

const VOLUME_CHINESE: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12,
  十三: 13,
  十四: 14,
  十五: 15,
  十六: 16,
  十七: 17,
  十八: 18,
  十九: 19,
  二十: 20,
  二十一: 21,
  二十二: 22,
  二十三: 23,
  二十四: 24,
  二十五: 25,
  二十六: 26,
}

const MAX_CHUNK = 150
const MIN_CHUNK = 80

const extractTheme = (header: string): string => {
  for (const [pattern, theme] of THEME_MAP) {
    if (pattern.test(header)) return theme
  }
  return '杂记'
}

const getDifficulty = (origin: string): number => {
  if (PRE_QIN.has(origin)) return 3
  if (HAN.has(origin)) return 2
  return 1
}

export const extractVolume = (header: string): number | null => {
  const m = header.match(/●卷([一二三四五六七八九十]+)·/)
  if (!m) return null
  return VOLUME_CHINESE[m[1]] ?? null
}

const splitLongParagraph = (para: string): string[] => {
  if (para.length <= MAX_CHUNK) return [para]

  const sentences = para.split(/(?<=[。！？])/)
  const result: string[] = []
  let current = ''

  for (const sent of sentences) {
    if (current.length + sent.length > MAX_CHUNK && current.length >= MIN_CHUNK) {
      result.push(current)
      current = sent
    } else {
      current += sent
    }
  }

  if (current.length > 0) {
    if (current.length < MIN_CHUNK && result.length > 0) {
      result[result.length - 1] += current
    } else {
      result.push(current)
    }
  }

  return result.length > 0 ? result : [para]
}

const chunkParagraphs = (paragraphs: string[], baseTitle: string): Array<{ title: string; content: string }> => {
  const expanded: string[] = []
  for (const para of paragraphs) expanded.push(...splitLongParagraph(para))

  const total = expanded.join('').length
  if (total <= MAX_CHUNK) return [{ title: baseTitle, content: expanded.join('\n') }]

  const chunks: string[][] = []
  let current: string[] = []
  let currentLen = 0

  for (const para of expanded) {
    if (currentLen + para.length > MAX_CHUNK && currentLen >= MIN_CHUNK) {
      chunks.push(current)
      current = [para]
      currentLen = para.length
    } else {
      current.push(para)
      currentLen += para.length
    }
  }

  if (current.length > 0) {
    if (currentLen < MIN_CHUNK && chunks.length > 0) chunks[chunks.length - 1].push(...current)
    else chunks.push(current)
  }

  if (chunks.length === 1) return [{ title: baseTitle, content: chunks[0].join('\n') }]

  return chunks.map((lines, i) => ({
    title: `${baseTitle}（${i + 1}）`,
    content: lines.join('\n'),
  }))
}

export const parseJingshiPassages = (filePath: string, volumes?: Set<number>): PassageSeedRecord[] => {
  const lines = readFileSync(filePath, 'utf-8').split('\n')
  const passages: PassageSeedRecord[] = []

  let currentTheme = ''
  let currentOrigin = ''
  let currentTitle = ''
  let rawLines: string[] = []
  let activeVolume: number | null = null
  let inScope = false

  const flush = () => {
    if (!currentOrigin || !inScope || activeVolume === null) return

    const paragraphs = rawLines
      // eslint-disable-next-line no-irregular-whitespace
      .map((line) => line.replace(/^[\s　]+/, '').replace(/[\s　]+$/, ''))
      .filter((line) => line.length > 0)

    rawLines = []
    if (paragraphs.join('').length < 20) return

    for (const chunk of chunkParagraphs(paragraphs, currentTitle)) {
      passages.push({
        source_book: '经史百家杂钞',
        source_origin: currentOrigin,
        title: chunk.title,
        content: chunk.content,
        difficulty: getDifficulty(currentOrigin),
        theme: currentTheme,
        volume: activeVolume,
        enabled: true,
      })
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '')

    if (line.startsWith('●')) {
      flush()
      currentOrigin = ''
      currentTitle = ''
      rawLines = []

      if (line.includes('序例')) {
        activeVolume = null
        inScope = false
        continue
      }

      currentTheme = extractTheme(line)
      activeVolume = extractVolume(line)
      inScope = !volumes || (activeVolume !== null && volumes.has(activeVolume))
      continue
    }

    if (line.startsWith('○')) {
      flush()
      currentOrigin = ''
      currentTitle = ''
      rawLines = []
      if (!inScope) continue

      const raw = line.slice(1).trim()
      const dash = raw.indexOf('-')
      if (dash !== -1) {
        currentOrigin = raw.slice(0, dash).trim()
        currentTitle = raw.slice(dash + 1).trim()
      } else {
        currentOrigin = raw
        currentTitle = raw
      }
      continue
    }

    if (!inScope || !currentOrigin) continue
    if (line.startsWith('　') || line.startsWith(' ') || line.startsWith('\t') || line.trim().length > 0) {
      rawLines.push(line)
    }
  }

  flush()
  return passages
}
