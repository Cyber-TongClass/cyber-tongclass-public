export function publicLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/账号或密码错误|\[CONVEX\b|Request ID|Server Error Called by client/.test(message)) {
    return "账号或密码错误，请重试"
  }
  return "登录失败，请稍后重试"
}

export function shouldRetryLegacyLogin(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (!/(?:ArgumentValidationError|Validator error)/i.test(message)) return false

  return /(?:extra field\s*[`"']?identifier|missing required field\s*[`"']?studentId)/i.test(message)
}
