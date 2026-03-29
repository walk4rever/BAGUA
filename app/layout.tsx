import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '小庄 — 你的中文表达伙伴',
  description: '让每个现代人都能轻松地读懂、说出、写出漂亮的中文。',
  icons: '/favicon.svg',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  )
}
