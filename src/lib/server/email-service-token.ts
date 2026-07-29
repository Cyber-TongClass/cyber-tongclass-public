export function getEmailVerificationServiceToken() {
  const serviceToken = process.env.EMAIL_VERIFICATION_SERVICE_TOKEN
  if (!serviceToken || serviceToken.length < 32) {
    throw new Error("EMAIL_VERIFICATION_SERVICE_TOKEN is not configured")
  }
  return serviceToken
}
