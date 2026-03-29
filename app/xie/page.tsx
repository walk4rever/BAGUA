import type { Metadata } from 'next'
import XieClient from './xie-client'

export const metadata: Metadata = {
  title: '仿写 — 小庄',
  description: '以王阳明文风为骨，写出文哲具佳的四六章句。',
}

export default function XiePage() {
  return <XieClient />
}
