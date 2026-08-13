export function getOADocumentServiceToken() {
  const serviceToken = process.env.OA_DOCUMENT_SERVICE_TOKEN
  if (!serviceToken || serviceToken.length < 32) throw new Error("OA_DOCUMENT_SERVICE_TOKEN is not configured")
  return serviceToken
}
