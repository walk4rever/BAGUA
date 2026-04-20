import {
  enrichPassageMeta,
  generateDuPayload,
  getPassageById,
  savePassagePayload,
  verifyCronSecret,
} from '@/lib/du-server'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret') ?? ''
  if (!verifyCronSecret(secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { passageId } = await request.json().catch(() => ({})) as { passageId?: number }
  if (!passageId) {
    return Response.json({ error: 'passageId required' }, { status: 400 })
  }

  const passage = await getPassageById(passageId)
  if (!passage) {
    return Response.json({ error: 'Passage not found' }, { status: 404 })
  }

  const payload = await generateDuPayload(passage)
  await savePassagePayload(passageId, payload)
  await enrichPassageMeta(passage)

  return Response.json({ message: 'Regenerated', passageId, title: passage.title })
}
