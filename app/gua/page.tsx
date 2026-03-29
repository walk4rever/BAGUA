import type { Metadata } from 'next'
import GuaClient from './gua-client'

export const metadata: Metadata = {
  title: '问卦 — 小庄',
  description: '以周易智慧为基，结合 AI 解读，起卦明事。',
}

export default function GuaPage() {
  return <GuaClient />
}
