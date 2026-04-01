import type { Metadata } from 'next'
import XunClient from './xun-client'

export const metadata: Metadata = {
  title: '寻章 — 小庄',
  description: '描述你的场景或心情，帮你找到最美的那句诗词古文。',
}

export default function XunPage() {
  return <XunClient />
}
