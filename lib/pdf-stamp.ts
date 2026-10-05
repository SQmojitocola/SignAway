interface AuditTrailInput {
  signerName: string
  signerNip?: string | null
  signedAt: Date
  isProxySigned: boolean
  targetName?: string
}

export function createAuditTrailText({
  signerName,
  signerNip,
  signedAt,
  isProxySigned,
  targetName,
}: AuditTrailInput) {
  if (isProxySigned && targetName) {
    return `Digital Signed by ${signerName} on behalf of ${targetName} (Proxy Approved by Admin) - ${signedAt.toISOString()}`
  }

  return `Digital Signed by ${signerName} (NIP: ${signerNip || '-'}) - ${signedAt.toISOString()}`
}