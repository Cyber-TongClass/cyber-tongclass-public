import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/lib/api.ts", "utf8")

test("AIA OA workflow and unified inbox are available only through session-aware API hooks", () => {
  for (const reference of [
    "oaForms:listMyApprovalInbox",
    "oaForms:actOnApprovalTask",
    "oaForms:listMyNotifications",
    "oaForms:markMyNotificationRead",
    "oaForms:markAllMyNotificationsRead",
  ]) {
    assert.match(source, new RegExp(`makeFunctionReference<[^>]+>\\(["']${reference}["']\\)`))
  }

  for (const hook of [
    "useOAForm",
    "useOAApprovalInbox",
    "useReviewOAFormSubmission",
    "useAiaNotifications",
    "useMarkAiaNotificationRead",
    "useMarkAllAiaNotificationsRead",
  ]) {
    assert.match(source, new RegExp(`export function ${hook}\\s*\\(`))
  }

  assert.match(source, /export function useOAForm\([\s\S]*?return usePublishedOAFormBySlug\(/)
  assert.match(source, /export function useOAApprovalInbox\([\s\S]*?listMyOAApprovalInboxRef/)
  assert.match(source, /export function useReviewOAFormSubmission\([\s\S]*?taskId:\s*args\.taskId\s+as any[\s\S]*?action:\s*args\.action/)
  assert.match(source, /export function useAiaNotifications\(options\?:\s*\{\s*enabled\?:\s*boolean\s*\}\)/)
  assert.match(source, /export function useAiaNotifications\([\s\S]*?options\?\.enabled\s*===\s*false\s*\?\s*["']skip["']/)
  assert.match(source, /export function useMarkAiaNotificationRead\([\s\S]*?notificationId:\s*notificationId\s+as any/)
  assert.match(source, /export function useMarkAllAiaNotificationsRead\([\s\S]*?getTongClassStoredSessionToken\(\)/)
})
