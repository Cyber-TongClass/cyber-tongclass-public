function constantTimeEqual(left: string, right: string) {
  const maximum = Math.max(left.length, right.length)
  let difference = left.length ^ right.length
  for (let index = 0; index < maximum; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return difference === 0
}

/** Prevents browsers from calling the raw analysis persistence mutation. */
export function requireOADocumentServiceToken(serviceToken: string) {
  const expected = process.env.OA_DOCUMENT_SERVICE_TOKEN
  if (!expected || expected.length < 32 || !constantTimeEqual(serviceToken, expected)) {
    throw new Error("OA_DOCUMENT_SERVICE_UNAUTHORIZED")
  }
}
