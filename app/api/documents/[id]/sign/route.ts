import { POST as handleSign } from '@/app/api/documents/sign/route'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: Record<string, unknown> = {}

  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const enrichedReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({
      ...body,
      documentId: id || body.documentId,
    }),
  })

  return handleSign(enrichedReq)
}
