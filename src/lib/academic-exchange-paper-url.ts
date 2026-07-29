/** Browser-visible allowlist for user-entered academic-exchange PDF URLs. */
export function isSafeExternalAcademicPaperPdfUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.toLowerCase() === "arxiv.org"
  } catch {
    return false
  }
}
