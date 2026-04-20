import { notFound } from 'next/navigation'
import { getPassageById, getPassageContext, getAuthor, getArticle, parseSegment } from '@/lib/du-server'
import DuDayClient from '../../[date]/du-day-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DuPreviewPage({ params }: Props) {
  const { id } = await params
  const passageId = parseInt(id, 10)
  if (isNaN(passageId)) notFound()

  const passage = await getPassageById(passageId).catch(() => null)
  if (!passage || !passage.payload) notFound()

  const { source_origin, title } = passage
  const baseTitle = title ? parseSegment(title).base : null

  const [context, author, article] = await Promise.all([
    source_origin && title
      ? getPassageContext(passageId, source_origin, title).catch(() => null)
      : Promise.resolve(null),
    source_origin ? getAuthor(source_origin).catch(() => null) : Promise.resolve(null),
    source_origin && baseTitle ? getArticle(source_origin, baseTitle).catch(() => null) : Promise.resolve(null),
  ])

  const run = {
    id: 0,
    run_date: '',
    passage_id: passageId,
    sent_count: 0,
    passage,
  }

  return <DuDayClient run={run} date={context?.contextLine ?? '预览'} context={context} author={author} article={article} />
}
