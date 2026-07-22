import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("convex/coffeeTalk.ts", "utf8")

function endpointBlock(startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `missing ${startMarker}`)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `missing end marker ${endMarker}`)
  return source.slice(start, end)
}

test("Coffee Talk-only notification endpoints never read or mutate OA notification rows", () => {
  const list = endpointBlock("export const listNotifications = query({", "export const markNotificationRead")
  const markOne = endpointBlock("export const markNotificationRead = mutation({", "export const markAllNotificationsRead")
  const markAll = source.slice(source.indexOf("export const markAllNotificationsRead = mutation({"))

  assert.match(list, /filter\(\(notification(?::\s*any)?\)\s*=>\s*notification\.kind\s*===\s*["']coffee_talk["']\)/)
  assert.match(markOne, /notification\.kind\s*!==\s*["']coffee_talk["']/)
  assert.match(markAll, /filter\(\(notification\)\s*=>\s*notification\.kind\s*===\s*["']coffee_talk["']\s*&&\s*notification\.readAt\s*===\s*undefined\)/)
})
